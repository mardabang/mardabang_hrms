package com.mardabang.hrms.employee.service;

import java.time.LocalDate;
import java.util.List;
import java.util.HashSet;
import java.util.ArrayList;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.mardabang.hrms.attendance.entity.AttendanceRecord;
import com.mardabang.hrms.attendance.repository.AttendanceRepository;
import com.mardabang.hrms.employee.dto.EmployeeDocument;
import com.mardabang.hrms.employee.dto.EmployeeDto;
import com.mardabang.hrms.employee.dto.EmployeeImportResult;
import com.mardabang.hrms.employee.entity.Employee;
import com.mardabang.hrms.employee.repository.EmployeeRepository;
import com.mardabang.hrms.employee.dto.EmployeeSelfUpdateRequest;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final EmployeeDocumentStorage documentStorage;
    private final AttendanceRepository attendanceRepository;

    public List<EmployeeDto> getAllEmployees(Long firmId) {
        List<Employee> employees = (firmId != null)
            ? employeeRepository.findByFirmId(firmId)
            : employeeRepository.findAll(); // fallback, or throw if you want firmId mandatory

        return employees.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }

    public EmployeeDto getEmployeeById(Long id) {
        return employeeRepository.findById(id)
            .map(this::mapToDto)
            .orElse(null);
    }

    public EmployeeDto getEmployeeByCode(String employeeCode) {
        return employeeRepository.findByEmployeeCode(employeeCode)
            .map(this::mapToDto)
            .orElse(null);
    }

    public EmployeeDto createEmployee(EmployeeDto dto) {
        validateEmployee(dto, true);
        if (employeeRepository.existsByEmployeeCode(dto.getEmployeeCode())) {
            throw new IllegalArgumentException("Employee code already exists");
        }

        Employee employee = mapToEntity(dto);
        Employee saved = employeeRepository.save(employee);
        return mapToDto(saved);
    }

    @Transactional
    public EmployeeDto createEmployeeWithDocuments(EmployeeDto dto, MultipartFile aadharDocument, MultipartFile panDocument) {
        validateEmployee(dto, true);
        if (employeeRepository.existsByEmployeeCode(dto.getEmployeeCode())) {
            throw new IllegalArgumentException("Employee code already exists");
        }

        EmployeeDocumentStorage.StoredDocument aadhar = null;
        EmployeeDocumentStorage.StoredDocument pan = null;
        try {
            aadhar = documentStorage.store(aadharDocument, dto.getEmployeeCode(), "aadhaar");
            pan = documentStorage.store(panDocument, dto.getEmployeeCode(), "pan");
            Employee employee = mapToEntity(dto);
            employee.setAadharDocumentName(aadhar.originalName());
            employee.setAadharDocumentKey(aadhar.key());
            employee.setPanDocumentName(pan.originalName());
            employee.setPanDocumentKey(pan.key());
            return mapToDto(employeeRepository.saveAndFlush(employee));
        } catch (RuntimeException ex) {
            if (aadhar != null) documentStorage.deleteQuietly(aadhar.key());
            if (pan != null) documentStorage.deleteQuietly(pan.key());
            throw ex;
        }
    }

    @Transactional
    public EmployeeDto uploadEmployeePhoto(String employeeCode, MultipartFile photo) {
        Employee employee = employeeRepository.findByEmployeeCode(employeeCode)
            .orElseThrow(() -> new IllegalArgumentException("Employee not found."));
        if (photo == null || photo.isEmpty()) {
            throw new IllegalArgumentException("Employee photo is required.");
        }

        String oldKey = employee.getProfilePhotoKey();
        EmployeeDocumentStorage.StoredDocument stored = documentStorage.storeImage(photo, employeeCode);
        employee.setProfilePhotoName(stored.originalName());
        employee.setProfilePhotoKey(stored.key());
        Employee saved = employeeRepository.save(employee);
        documentStorage.deleteQuietly(oldKey);
        return mapToDto(saved);
    }

    public EmployeeDocument getEmployeePhoto(String employeeCode) {
        Employee employee = employeeRepository.findByEmployeeCode(employeeCode)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found."));

        if (isBlank(employee.getProfilePhotoKey())) {
            throw new IllegalArgumentException("Employee photo not found.");
        }

        byte[] content = documentStorage.load(employee.getProfilePhotoKey());

        return new EmployeeDocument(
                employee.getProfilePhotoName(),
                content,
                detectMimeType(employee.getProfilePhotoKey())
        );
    }

    @Transactional
    public EmployeeImportResult importEmployees(List<EmployeeDto> rows) {
        if (rows == null || rows.isEmpty()) {
            throw new IllegalArgumentException("The import file contains no employee rows.");
        }

        Set<String> batchCodes = new HashSet<>();
        List<String> importedCodes = new ArrayList<>();
        int created = 0;
        int updated = 0;

        for (EmployeeDto row : rows) {
            validateEmployee(row, false);
            String code = row.getEmployeeCode().trim();
            row.setEmployeeCode(code);
            if (!batchCodes.add(code.toUpperCase())) {
                throw new IllegalArgumentException("Duplicate employee code in import: " + code);
            }
            importedCodes.add(code);

            Employee employee = employeeRepository.findByEmployeeCode(code).orElse(null);
            if (employee == null) {
                employee = mapToEntity(row);
                created++;
            } else {
                applyUpdates(employee, row);
                updated++;
            }
            employeeRepository.save(employee);
        }

        List<EmployeeDto> imported = importedCodes.stream()
            .map(code -> employeeRepository.findByEmployeeCode(code).orElse(null))
            .filter(java.util.Objects::nonNull)
            .map(this::mapToDto)
            .collect(Collectors.toList());

        return new EmployeeImportResult(rows.size(), created, updated, imported);
    }

    public EmployeeDto updateEmployee(Long id, EmployeeDto dto) {
        Employee employee = employeeRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        validateEmployee(dto, true);
        applyUpdates(employee, dto);

        return mapToDto(employeeRepository.save(employee));
    }

    public EmployeeDto updateEmployeeByCode(String employeeCode, EmployeeDto dto) {
        Employee employee = employeeRepository.findByEmployeeCode(employeeCode)
            .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        validateEmployee(dto, true);
        applyUpdates(employee, dto);

        return mapToDto(employeeRepository.save(employee));
    }
    
    @Transactional
    public EmployeeDto updateEmployeeStatus(
            String employeeCode,
            boolean active) {

        Employee employee = employeeRepository
                .findByEmployeeCode(employeeCode)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Employee not found with employee code: "
                                        + employeeCode
                        )
                );

        employee.setActive(active);
        employee.setStatus(active ? "Active" : "Inactive");

        return mapToDto(
                employeeRepository.save(employee)
        );
    }

    /**
     * Safely reassigns an employee's employeeCode, cascading the
     * change to all of that employee's historical AttendanceRecord
     * rows (which store employeeCode as a plain string, not a FK).
     *
     * SalaryRecord does NOT need a cascade here — it links to
     * employees via employee_id (a Long FK to Employee.id), which
     * never changes.
     */
    @Transactional
    public EmployeeDto reassignEmployeeCode(Long employeeId, String newEmployeeCode) {

        if (employeeId == null) {
            throw new IllegalArgumentException("Employee ID is required.");
        }

        if (newEmployeeCode == null || newEmployeeCode.isBlank()) {
            throw new IllegalArgumentException("New employee code is required.");
        }

        String trimmedNewCode = newEmployeeCode.trim();

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found."));

        String oldEmployeeCode = employee.getEmployeeCode();

        if (trimmedNewCode.equalsIgnoreCase(oldEmployeeCode)) {
            return mapToDto(employee);
        }

        if (!trimmedNewCode.matches("^[A-Za-z0-9][A-Za-z0-9-]{2,19}$")) {
            throw new IllegalArgumentException(
                    "Employee code must be 3-20 letters, numbers, or hyphens.");
        }

        if (employeeRepository.existsByEmployeeCode(trimmedNewCode)) {
            throw new IllegalArgumentException(
                    "Employee code " + trimmedNewCode + " is already in use.");
        }

        employee.setEmployeeCode(trimmedNewCode);
        employeeRepository.save(employee);

        List<AttendanceRecord> attendanceRecords =
                attendanceRepository.findByEmployeeCode(oldEmployeeCode);

        for (AttendanceRecord record : attendanceRecords) {
            record.setEmployeeCode(trimmedNewCode);
        }

        attendanceRepository.saveAll(attendanceRecords);

        return mapToDto(employee);
    }

    @Transactional
    public EmployeeDto updateEmployeeWithDocuments(String employeeCode, EmployeeDto dto,
            MultipartFile aadharDocument, MultipartFile panDocument) {
        Employee employee = employeeRepository.findByEmployeeCode(employeeCode)
            .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
        validateEmployee(dto, true);

        boolean hasAadhar = aadharDocument != null && !aadharDocument.isEmpty();
        boolean hasPan = panDocument != null && !panDocument.isEmpty();
        if (!hasAadhar && isBlank(employee.getAadharDocumentKey())) {
            throw new IllegalArgumentException("Aadhaar PDF is required.");
        }
        if (!hasPan && isBlank(employee.getPanDocumentKey())) {
            throw new IllegalArgumentException("PAN PDF is required.");
        }

        EmployeeDocumentStorage.StoredDocument newAadhar = null;
        EmployeeDocumentStorage.StoredDocument newPan = null;
        String oldAadharKey = employee.getAadharDocumentKey();
        String oldPanKey = employee.getPanDocumentKey();
        try {
            if (hasAadhar) newAadhar = documentStorage.store(aadharDocument, employeeCode, "aadhaar");
            if (hasPan) newPan = documentStorage.store(panDocument, employeeCode, "pan");
            applyUpdates(employee, dto);
            if (newAadhar != null) {
                employee.setAadharDocumentName(newAadhar.originalName());
                employee.setAadharDocumentKey(newAadhar.key());
            }
            if (newPan != null) {
                employee.setPanDocumentName(newPan.originalName());
                employee.setPanDocumentKey(newPan.key());
            }
            EmployeeDto saved = mapToDto(employeeRepository.saveAndFlush(employee));
            if (newAadhar != null) documentStorage.deleteQuietly(oldAadharKey);
            if (newPan != null) documentStorage.deleteQuietly(oldPanKey);
            return saved;
        } catch (RuntimeException ex) {
            if (newAadhar != null) documentStorage.deleteQuietly(newAadhar.key());
            if (newPan != null) documentStorage.deleteQuietly(newPan.key());
            throw ex;
        }
    }

    public EmployeeDocument getEmployeeDocument(String employeeCode, String documentType) {
        Employee employee = employeeRepository.findByEmployeeCode(employeeCode)
            .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
        if ("aadhaar".equalsIgnoreCase(documentType)) {
            return new EmployeeDocument(employee.getAadharDocumentName(), documentStorage.load(employee.getAadharDocumentKey()), "application/pdf");
        }
        if ("pan".equalsIgnoreCase(documentType)) {
            return new EmployeeDocument(employee.getPanDocumentName(), documentStorage.load(employee.getPanDocumentKey()), "application/pdf");
        }
        throw new IllegalArgumentException("Document type must be aadhaar or pan.");
    }

    public void deleteEmployee(Long id) {
        employeeRepository.findById(id).ifPresent(employee -> {
            employeeRepository.delete(employee);
            documentStorage.deleteQuietly(employee.getAadharDocumentKey());
            documentStorage.deleteQuietly(employee.getPanDocumentKey());
        });
    }

    public void deleteEmployeeByCode(String employeeCode) {
        employeeRepository.findByEmployeeCode(employeeCode).ifPresent(employee -> {
            employeeRepository.delete(employee);
            documentStorage.deleteQuietly(employee.getAadharDocumentKey());
            documentStorage.deleteQuietly(employee.getPanDocumentKey());
        });
    }

    private Employee mapToEntity(EmployeeDto dto) {
        Employee employee = new Employee();
        employee.setFirmId(dto.getFirmId());
        employee.setEmployeeCode(dto.getEmployeeCode());
        employee.setName(dto.getName());
        employee.setDepartment(dto.getDepartment());
        employee.setDesignation(dto.getDesignation());
        employee.setFirstName(dto.getFirstName());
        employee.setLastName(dto.getLastName());
        employee.setContact(dto.getContact());
        employee.setEmail(dto.getEmail());
        employee.setGender(dto.getGender());
        employee.setDateOfBirth(dto.getDateOfBirth());
        employee.setEmploymentType(dto.getEmploymentType());
        employee.setAddress(dto.getAddress());
        employee.setJoiningDate(dto.getJoiningDate());
        employee.setWageType(dto.getWageType());
        employee.setMonthlySalary(dto.getMonthlySalary());
        employee.setPaymentMode(dto.getPaymentMode());
        employee.setShiftLength(dto.getShiftLength());
        employee.setOtStartsAfter(dto.getOtStartsAfter());
        employee.setOtRate(dto.getOtRate());
        employee.setAccountNumber(dto.getAccountNumber());
        employee.setIfscCode(dto.getIfscCode());
        employee.setBankName(dto.getBankName());
        employee.setPfAccountNumber(dto.getPfAccountNumber());
        employee.setEsiAccountNumber(dto.getEsiAccountNumber());
        employee.setAadharNumber(dto.getAadharNumber());
        employee.setPanNumber(dto.getPanNumber());
        employee.setStatutorySchemes(dto.getStatutorySchemes());
        employee.setActive(dto.getActive() != null ? dto.getActive() : true);
        employee.setStatus(dto.getStatus() != null ? dto.getStatus() : (dto.getActive() != null && dto.getActive() ? "Active" : "Inactive"));
        return employee;
    }

    /*
     * NOTE: employeeCode is intentionally NOT updated here.
     * Changing an employee's code has cascading effects on
     * historical attendance records — use
     * EmployeeService.reassignEmployeeCode(...) instead, which
     * performs the change safely along with the required cascade.
     */
    private void applyUpdates(Employee employee, EmployeeDto dto) {
        employee.setName(dto.getName() != null ? dto.getName() : employee.getName());
        employee.setDepartment(dto.getDepartment() != null ? dto.getDepartment() : employee.getDepartment());
        employee.setDesignation(dto.getDesignation() != null ? dto.getDesignation() : employee.getDesignation());
        employee.setFirstName(dto.getFirstName() != null ? dto.getFirstName() : employee.getFirstName());
        employee.setLastName(dto.getLastName() != null ? dto.getLastName() : employee.getLastName());
        employee.setContact(dto.getContact() != null ? dto.getContact() : employee.getContact());
        employee.setEmail(dto.getEmail() != null ? dto.getEmail() : employee.getEmail());
        employee.setGender(dto.getGender() != null ? dto.getGender() : employee.getGender());
        employee.setDateOfBirth(dto.getDateOfBirth() != null ? dto.getDateOfBirth() : employee.getDateOfBirth());
        employee.setEmploymentType(dto.getEmploymentType() != null ? dto.getEmploymentType() : employee.getEmploymentType());
        employee.setAddress(dto.getAddress() != null ? dto.getAddress() : employee.getAddress());
        employee.setJoiningDate(dto.getJoiningDate() != null ? dto.getJoiningDate() : employee.getJoiningDate());
        employee.setWageType(dto.getWageType() != null ? dto.getWageType() : employee.getWageType());
        employee.setMonthlySalary(dto.getMonthlySalary() != null ? dto.getMonthlySalary() : employee.getMonthlySalary());
        employee.setPaymentMode(dto.getPaymentMode() != null ? dto.getPaymentMode() : employee.getPaymentMode());
        employee.setShiftLength(dto.getShiftLength() != null ? dto.getShiftLength() : employee.getShiftLength());
        employee.setOtStartsAfter(dto.getOtStartsAfter() != null ? dto.getOtStartsAfter() : employee.getOtStartsAfter());
        employee.setOtRate(dto.getOtRate() != null ? dto.getOtRate() : employee.getOtRate());
        employee.setAccountNumber(dto.getAccountNumber() != null ? dto.getAccountNumber() : employee.getAccountNumber());
        employee.setIfscCode(dto.getIfscCode() != null ? dto.getIfscCode() : employee.getIfscCode());
        employee.setBankName(dto.getBankName() != null ? dto.getBankName() : employee.getBankName());
        employee.setPfAccountNumber(dto.getPfAccountNumber() != null ? dto.getPfAccountNumber() : employee.getPfAccountNumber());
        employee.setEsiAccountNumber(dto.getEsiAccountNumber() != null ? dto.getEsiAccountNumber() : employee.getEsiAccountNumber());
        employee.setAadharNumber(dto.getAadharNumber() != null ? dto.getAadharNumber() : employee.getAadharNumber());
        employee.setPanNumber(dto.getPanNumber() != null ? dto.getPanNumber() : employee.getPanNumber());
        employee.setStatutorySchemes(dto.getStatutorySchemes() != null ? dto.getStatutorySchemes() : employee.getStatutorySchemes());
        employee.setActive(dto.getActive() != null ? dto.getActive() : employee.getActive());
        employee.setStatus(dto.getStatus() != null ? dto.getStatus() : employee.getStatus());
    }

    private void validateEmployee(EmployeeDto dto, boolean requireBankDetails) {
        if (dto == null || isBlank(dto.getEmployeeCode()) || isBlank(dto.getName())
                || isBlank(dto.getDepartment()) || isBlank(dto.getDesignation())
                || dto.getJoiningDate() == null || isBlank(dto.getWageType())
                || dto.getMonthlySalary() == null || dto.getMonthlySalary().signum() <= 0
                || isBlank(dto.getPaymentMode())) {
            throw new IllegalArgumentException("Each employee requires code, name, department, designation, joining date, wage type, positive salary, and payment mode.");
        }
        if (!dto.getPaymentMode().equalsIgnoreCase("Bank")
                && !dto.getPaymentMode().equalsIgnoreCase("Cash")) {
            throw new IllegalArgumentException("Payment mode must be Bank or Cash for employee " + dto.getEmployeeCode());
        }
        if (!dto.getWageType().equalsIgnoreCase("Monthly")
                && !dto.getWageType().equalsIgnoreCase("Daily")) {
            throw new IllegalArgumentException("Wage type must be Monthly or Daily.");
        }
        if (dto.getJoiningDate().isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("Joining date cannot be in the future.");
        }
        if (!dto.getEmployeeCode().matches("^[A-Za-z0-9][A-Za-z0-9-]{2,19}$")) {
            throw new IllegalArgumentException("Employee code must be 3-20 letters, numbers, or hyphens.");
        }
        if (dto.getName().trim().length() < 2 || dto.getName().trim().length() > 100) {
            throw new IllegalArgumentException("Employee name must be between 2 and 100 characters.");
        }
        if (requireBankDetails && isBlank(dto.getContact())) {
            throw new IllegalArgumentException("Mobile number is required.");
        }
        if (!isBlank(dto.getContact()) && !dto.getContact().matches("^[6-9][0-9]{9}$")) {
            throw new IllegalArgumentException("Mobile number must be a valid 10-digit Indian mobile number.");
        }
        if (!isBlank(dto.getEmail()) && !dto.getEmail().matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new IllegalArgumentException("Employee email address is invalid.");
        }
        if (requireBankDetails && dto.getPaymentMode().equalsIgnoreCase("Bank")) {
            if (isBlank(dto.getAccountNumber()) || !dto.getAccountNumber().matches("^[0-9]{9,18}$")) {
                throw new IllegalArgumentException("A 9-18 digit account number is required for bank transfer.");
            }
            if (isBlank(dto.getIfscCode()) || !dto.getIfscCode().matches("^[A-Z]{4}0[A-Z0-9]{6}$")) {
                throw new IllegalArgumentException("A valid IFSC code is required for bank transfer.");
            }
            if (isBlank(dto.getBankName()) || dto.getBankName().trim().length() < 2) {
                throw new IllegalArgumentException("Bank name is required for bank transfer.");
            }
        }
        if (!isBlank(dto.getIfscCode()) && !dto.getIfscCode().matches("^[A-Z]{4}0[A-Z0-9]{6}$")) {
            throw new IllegalArgumentException("IFSC code is invalid.");
        }
        if (requireBankDetails && isBlank(dto.getAadharNumber())) {
            throw new IllegalArgumentException("Aadhaar number is required.");
        }
        if (!isBlank(dto.getAadharNumber()) && !dto.getAadharNumber().matches("^[0-9]{12}$")) {
            throw new IllegalArgumentException("Aadhaar number must contain 12 digits.");
        }
        if (requireBankDetails && isBlank(dto.getPanNumber())) {
            throw new IllegalArgumentException("PAN number is required.");
        }
        if (!isBlank(dto.getPanNumber()) && !dto.getPanNumber().matches("^[A-Z]{5}[0-9]{4}[A-Z]$")) {
            throw new IllegalArgumentException("PAN number is invalid.");
        }
        if (dto.getOtRate() != null && dto.getOtRate().signum() < 0) {
            throw new IllegalArgumentException("Overtime rate cannot be negative.");
        }
        if (dto.getShiftLength() != null && dto.getShiftLength() != 8 && dto.getShiftLength() != 12) {
            throw new IllegalArgumentException("Shift length must be 8 or 12 hours.");
        }
        if (dto.getOtStartsAfter() != null && dto.getOtStartsAfter() != 8 && dto.getOtStartsAfter() != 12) {
            throw new IllegalArgumentException("Overtime threshold must be 8 or 12 hours.");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private EmployeeDto mapToDto(Employee employee) {
        return EmployeeDto.builder()
            .id(employee.getId())
            .firmId(employee.getFirmId())
            .employeeCode(employee.getEmployeeCode())
            .name(employee.getName())
            .department(employee.getDepartment())
            .designation(employee.getDesignation())
            .firstName(employee.getFirstName())
            .lastName(employee.getLastName())
            .contact(employee.getContact())
            .email(employee.getEmail())
            .gender(employee.getGender())
            .dateOfBirth(employee.getDateOfBirth())
            .employmentType(employee.getEmploymentType())
            .address(employee.getAddress())
            .joiningDate(employee.getJoiningDate())
            .wageType(employee.getWageType())
            .monthlySalary(employee.getMonthlySalary())
            .paymentMode(employee.getPaymentMode())
            .shiftLength(employee.getShiftLength())
            .otStartsAfter(employee.getOtStartsAfter())
            .otRate(employee.getOtRate())
            .accountNumber(employee.getAccountNumber())
            .ifscCode(employee.getIfscCode())
            .bankName(employee.getBankName())
            .pfAccountNumber(employee.getPfAccountNumber())
            .esiAccountNumber(employee.getEsiAccountNumber())
            .aadharNumber(employee.getAadharNumber())
            .panNumber(employee.getPanNumber())
            .profilePhotoName(employee.getProfilePhotoName())
            .profilePhotoKey(employee.getProfilePhotoKey())
            .hasProfilePhoto(!isBlank(employee.getProfilePhotoKey()))
            .hasAadharDocument(!isBlank(employee.getAadharDocumentKey()))
            .hasPanDocument(!isBlank(employee.getPanDocumentKey()))
            .statutorySchemes(employee.getStatutorySchemes())
            .active(employee.getActive())
            .status(employee.getStatus())
            .build();
    }

    private String detectMimeType(String key) {
        String lower = key.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        return "image/jpeg";
    }
    
    @Transactional
    public void setCreatedBy(String employeeCode, Long creatorUserId) {
        Employee employee = employeeRepository.findByEmployeeCode(employeeCode)
            .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
        employee.setCreatedByUserId(creatorUserId);
        employeeRepository.save(employee);
    }
    
    
    public List<EmployeeDto> getEmployeesCreatedBy(Long creatorUserId) {
        return employeeRepository.findByCreatedByUserId(creatorUserId).stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
    
    @Transactional
    public EmployeeDto updateOwnProfile(String employeeCode, EmployeeSelfUpdateRequest req) {
        Employee employee = employeeRepository.findByEmployeeCode(employeeCode)
            .orElseThrow(() -> new IllegalArgumentException("Employee not found."));

        if (req.getContact() != null) {
            if (!req.getContact().matches("^[6-9][0-9]{9}$")) {
                throw new IllegalArgumentException("Mobile number must be a valid 10-digit Indian mobile number.");
            }
            employee.setContact(req.getContact());
        }
        if (req.getAddress() != null) {
            employee.setAddress(req.getAddress());
        }
        if (req.getAccountNumber() != null) {
            if (!req.getAccountNumber().matches("^[0-9]{9,18}$")) {
                throw new IllegalArgumentException("A 9-18 digit account number is required.");
            }
            employee.setAccountNumber(req.getAccountNumber());
        }
        if (req.getIfscCode() != null) {
            if (!req.getIfscCode().matches("^[A-Z]{4}0[A-Z0-9]{6}$")) {
                throw new IllegalArgumentException("A valid IFSC code is required.");
            }
            employee.setIfscCode(req.getIfscCode());
        }
        if (req.getBankName() != null) {
            if (req.getBankName().trim().length() < 2) {
                throw new IllegalArgumentException("Bank name is too short.");
            }
            employee.setBankName(req.getBankName());
        }

        return mapToDto(employeeRepository.save(employee));
    }
}