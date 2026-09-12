package com.mardabang.hrms.payroll.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mardabang.hrms.employee.entity.Employee;
import com.mardabang.hrms.employee.repository.EmployeeRepository;
import com.mardabang.hrms.firms.entity.Firm;
import com.mardabang.hrms.firms.repository.FirmRepository;
import com.mardabang.hrms.payroll.dto.CreditHistoryEntry;
import com.mardabang.hrms.payroll.dto.IssueCreditRequest;
import com.mardabang.hrms.payroll.dto.OutstandingSummary;
import com.mardabang.hrms.payroll.entity.CreditRepayment;
import com.mardabang.hrms.payroll.entity.EmployeeCreditRecord;
import com.mardabang.hrms.payroll.repository.CreditRepaymentRepository;
import com.mardabang.hrms.payroll.repository.EmployeeCreditRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CreditService {

    private final EmployeeCreditRepository creditRepository;
    private final CreditRepaymentRepository repaymentRepository;
    private final EmployeeRepository employeeRepository;
    private final FirmRepository firmRepository;

    // ------------------------------------------------------------
    // Issue a new advance or loan (admin only, enforced at controller)
    // ------------------------------------------------------------
    @Transactional
    public EmployeeCreditRecord issueCredit(IssueCreditRequest request, Long adminUserId) {
        if (!"ADVANCE".equalsIgnoreCase(request.getType()) && !"LOAN".equalsIgnoreCase(request.getType())) {
            throw new IllegalArgumentException("Type must be ADVANCE or LOAN.");
        }

        Employee employee = employeeRepository.findByEmployeeCode(request.getEmployeeCode())
                .orElseThrow(() -> new IllegalArgumentException("Employee not found: " + request.getEmployeeCode()));

        Firm firm = firmRepository.findByCode(request.getFirmCode())
                .orElseThrow(() -> new IllegalArgumentException("Firm not found: " + request.getFirmCode()));

        if (request.getEmiAmount().compareTo(request.getPrincipalAmount()) > 0) {
            throw new IllegalArgumentException("EMI amount cannot exceed the principal amount.");
        }

        EmployeeCreditRecord record = EmployeeCreditRecord.builder()
                .employeeId(employee.getId())
                .firmId(firm.getId())
                .type(request.getType().toUpperCase())
                .principalAmount(request.getPrincipalAmount())
                .emiAmount(request.getEmiAmount())
                .issueDate(LocalDate.now())
                .reason(request.getReason())
                .status("ACTIVE")
                .createdByUserId(adminUserId)
                .build();

        return creditRepository.save(record);
    }

    // ------------------------------------------------------------
    // Edit EMI amount on an active credit record
    // ------------------------------------------------------------
    @Transactional
    public EmployeeCreditRecord updateEmi(Long creditRecordId, BigDecimal newEmiAmount) {
        EmployeeCreditRecord record = creditRepository.findById(creditRecordId)
                .orElseThrow(() -> new IllegalArgumentException("Credit record not found."));

        if (!"ACTIVE".equals(record.getStatus())) {
            throw new IllegalArgumentException("Cannot edit EMI on a closed credit record.");
        }
        if (newEmiAmount.signum() <= 0) {
            throw new IllegalArgumentException("EMI amount must be positive.");
        }

        record.setEmiAmount(newEmiAmount);
        return creditRepository.save(record);
    }

    // ------------------------------------------------------------
    // Manual repayment (admin records money paid back outside payroll)
    // ------------------------------------------------------------
    @Transactional
    public EmployeeCreditRecord recordManualRepayment(Long creditRecordId, BigDecimal amount, String notes) {
        EmployeeCreditRecord record = creditRepository.findById(creditRecordId)
                .orElseThrow(() -> new IllegalArgumentException("Credit record not found."));

        BigDecimal outstanding = getOutstanding(record);
        if (amount.compareTo(outstanding) > 0) {
            throw new IllegalArgumentException("Repayment amount exceeds outstanding balance of " + outstanding);
        }

        CreditRepayment repayment = CreditRepayment.builder()
                .creditRecordId(record.getId())
                .amount(amount)
                .repaymentDate(LocalDate.now())
                .source("MANUAL")
                .notes(notes)
                .build();
        repaymentRepository.save(repayment);

        closeIfSettled(record);
        return record;
    }

    // ------------------------------------------------------------
    // Called from SalaryRecordService.finalizePayroll() for each employee.
    // Deducts EMIs from all active credit records, returns total deducted
    // so it can be folded into that employee's SalaryRecord.deductions.
    // ------------------------------------------------------------
    @Transactional
    public BigDecimal applyPayrollDeductions(Long employeeId, Long salaryRecordId) {
        List<EmployeeCreditRecord> activeCredits = creditRepository.findByEmployeeIdAndStatus(employeeId, "ACTIVE");
        BigDecimal totalDeducted = BigDecimal.ZERO;

        for (EmployeeCreditRecord record : activeCredits) {
            BigDecimal outstanding = getOutstanding(record);
            if (outstanding.signum() <= 0) {
                record.setStatus("CLOSED");
                creditRepository.save(record);
                continue;
            }

            BigDecimal deduction = record.getEmiAmount().min(outstanding);

            CreditRepayment repayment = CreditRepayment.builder()
                    .creditRecordId(record.getId())
                    .amount(deduction)
                    .repaymentDate(LocalDate.now())
                    .salaryRecordId(salaryRecordId)
                    .source("PAYROLL_AUTO")
                    .build();
            repaymentRepository.save(repayment);

            totalDeducted = totalDeducted.add(deduction);
            closeIfSettled(record);
        }

        return totalDeducted;
    }

    // ------------------------------------------------------------
    // Outstanding summary for the Ledger Report - shape matches
    // Reports.jsx's ledgerSummary exactly: { advance, loan, outstanding }
    // ------------------------------------------------------------
    public OutstandingSummary getOutstandingForEmployee(Long employeeId) {
        List<EmployeeCreditRecord> records = creditRepository.findByEmployeeIdAndStatus(employeeId, "ACTIVE");

        BigDecimal advance = BigDecimal.ZERO;
        BigDecimal loan = BigDecimal.ZERO;

        for (EmployeeCreditRecord record : records) {
            BigDecimal outstanding = getOutstanding(record);
            if ("ADVANCE".equals(record.getType())) {
                advance = advance.add(outstanding);
            } else {
                loan = loan.add(outstanding);
            }
        }

        return new OutstandingSummary(advance, loan, advance.add(loan));
    }

    // ------------------------------------------------------------
    // Full chronological history (issuance + every repayment) for the
    // Ledger Report's transaction table.
    // ------------------------------------------------------------
    public List<CreditHistoryEntry> getHistoryForEmployee(Long employeeId) {
        List<EmployeeCreditRecord> records = creditRepository.findByEmployeeId(employeeId);
        if (records.isEmpty()) {
            return List.of();
        }

        List<Long> recordIds = records.stream().map(EmployeeCreditRecord::getId).collect(Collectors.toList());
        List<CreditRepayment> repayments = repaymentRepository.findByCreditRecordIdInOrderByRepaymentDateAsc(recordIds);

        Map<Long, EmployeeCreditRecord> recordById = records.stream()
                .collect(Collectors.toMap(EmployeeCreditRecord::getId, r -> r));

        List<CreditHistoryEntry> history = new ArrayList<>();

        for (EmployeeCreditRecord record : records) {
            history.add(new CreditHistoryEntry(
                    record.getId(),
                    record.getType() + "_ISSUED",
                    record.getIssueDate(),
                    record.getPrincipalAmount(),
                    (record.getReason() == null || record.getReason().isBlank())
                            ? record.getType() + " issued"
                            : record.getType() + " issued - " + record.getReason(),
                    null
            ));
        }

        for (CreditRepayment repayment : repayments) {
            EmployeeCreditRecord parent = recordById.get(repayment.getCreditRecordId());
            String label = parent != null ? parent.getType() + " repayment" : "Repayment";
            history.add(new CreditHistoryEntry(
                    repayment.getId(),
                    "REPAYMENT",
                    repayment.getRepaymentDate(),
                    repayment.getAmount(),
                    label,
                    repayment.getSource()
            ));
        }

        history.sort((a, b) -> a.getDate().compareTo(b.getDate()));
        return history;
    }

    // ------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------
    private BigDecimal getOutstanding(EmployeeCreditRecord record) {
        BigDecimal repaid = repaymentRepository.findByCreditRecordId(record.getId()).stream()
                .map(CreditRepayment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return record.getPrincipalAmount().subtract(repaid);
    }

    private void closeIfSettled(EmployeeCreditRecord record) {
        if (getOutstanding(record).signum() <= 0) {
            record.setStatus("CLOSED");
            creditRepository.save(record);
        }
    }
}