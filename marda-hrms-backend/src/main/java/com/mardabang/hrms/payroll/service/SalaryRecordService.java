package com.mardabang.hrms.payroll.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.ArrayList;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mardabang.hrms.attendance.entity.AttendanceRecord;
import com.mardabang.hrms.attendance.entity.AttendanceStatus;
import com.mardabang.hrms.attendance.repository.AttendanceRepository;
import com.mardabang.hrms.employee.entity.Employee;
import com.mardabang.hrms.employee.repository.EmployeeRepository;
import com.mardabang.hrms.payroll.entity.PayrollRule;
import com.mardabang.hrms.payroll.entity.SalaryRecord;
import com.mardabang.hrms.payroll.repository.SalaryRecordRepository;
import com.mardabang.hrms.payroll.dto.PaymentRequest;


@Service
public class SalaryRecordService {

    private final SalaryRecordRepository salaryRecordRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final PayrollRuleService payrollRuleService;
    private final com.mardabang.hrms.firms.repository.FirmRepository firmRepository;
    private final CreditService creditService;

    public SalaryRecordService(
            SalaryRecordRepository salaryRecordRepository,
            EmployeeRepository employeeRepository,
            AttendanceRepository attendanceRepository,
            PayrollRuleService payrollRuleService,
            com.mardabang.hrms.firms.repository.FirmRepository firmRepository,
            CreditService creditService) {

        this.salaryRecordRepository = salaryRecordRepository;
        this.employeeRepository = employeeRepository;
        this.attendanceRepository = attendanceRepository;
        this.payrollRuleService = payrollRuleService;
        this.firmRepository = firmRepository;
        this.creditService = creditService;
    }

    @Transactional
    public SalaryRecord generateSalary(
            String employeeCode,
            String firmCode,
            YearMonth salaryMonth) {

        if (employeeCode == null || employeeCode.isBlank()) {
            throw new IllegalArgumentException("Employee code is required.");
        }

        if (firmCode == null || firmCode.isBlank()) {
            throw new IllegalArgumentException("Firm code is required.");
        }

        if (salaryMonth == null) {
            throw new IllegalArgumentException("Salary month is required.");
        }

        Employee employee = employeeRepository
                .findByEmployeeCode(employeeCode.trim())
                .orElseThrow(() ->
                        new IllegalArgumentException("Employee not found."));

        if (employee.getMonthlySalary() == null) {
            throw new IllegalArgumentException(
                    "Employee monthly salary is not configured.");
        }

        PayrollRule payrollRule =
                payrollRuleService.getRules(firmCode);

        int divisor = payrollRule.getMonthlySalaryDivisor();

        LocalDate monthStart = salaryMonth.atDay(1);
        LocalDate monthEnd = salaryMonth.atEndOfMonth();

        /*
         * Do not treat future dates as absent.
         *
         * Example:
         * If payroll is generated on September 2,
         * only September 1 and September 2 are considered.
         */
        LocalDate calculationEnd = monthEnd;

        if (salaryMonth.equals(YearMonth.now())) {
            calculationEnd = LocalDate.now();
        }

        /*
         * For a future month there are no elapsed working days.
         */
        if (calculationEnd.isBefore(monthStart)) {
            calculationEnd = monthStart.minusDays(1);
        }

        List<AttendanceRecord> attendanceRecords =
                attendanceRepository
                        .findByEmployeeCodeAndAttendanceDateBetweenOrderByAttendanceDateAsc(
                                employee.getEmployeeCode(),
                                monthStart,
                                calculationEnd);

        BigDecimal monthlySalary = employee.getMonthlySalary()
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal dailySalary = monthlySalary
                .divide(
                        BigDecimal.valueOf(divisor),
                        2,
                        RoundingMode.HALF_UP);

        BigDecimal absentDays = calculateAbsentDays(
                attendanceRecords,
                payrollRule,
                monthStart,
                calculationEnd);

        BigDecimal paidDays = calculatePaidDays(
                attendanceRecords,
                payrollRule,
                monthStart,
                calculationEnd);

        BigDecimal absenceDeduction = dailySalary
                .multiply(absentDays)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal overtimeHours =
                calculateOvertimeHours(attendanceRecords);

        BigDecimal overtimeAmount =
                calculateOvertimeAmount(
                        employee,
                        overtimeHours);

        // ------------------------------------------------------------
        // FIX #3: Statutory deductions (e.g. Provident Fund)
        // ------------------------------------------------------------
        BigDecimal statutoryDeductions =
                calculateStatutoryDeductions(
                        monthlySalary,
                        payrollRule);

        BigDecimal deductions = absenceDeduction
                .add(statutoryDeductions)
                .setScale(2, RoundingMode.HALF_UP);

        // ------------------------------------------------------------
        // Look up any existing record for this employee/month FIRST,
        // so we can (a) guard against overwriting paid/finalized
        // records, and (b) preserve an existing bonus on regeneration.
        // ------------------------------------------------------------
        SalaryRecord salaryRecord =
                salaryRecordRepository
                        .findByEmployeeIdAndSalaryMonth(
                                employee.getId(),
                                monthStart)
                        .orElseGet(SalaryRecord::new);

        // ------------------------------------------------------------
        // FIX #1: Never silently overwrite a paid/finalized record
        // ------------------------------------------------------------
        
        if (salaryRecord.getPaymentStatus() != null
                && (salaryRecord.getPaymentStatus().equalsIgnoreCase("PAID")
                    || salaryRecord.getPaymentStatus().equalsIgnoreCase("FINALIZED"))) {
        	
        	

            throw new IllegalArgumentException(
                    "Cannot regenerate salary for " + employeeCode
                    + " in " + salaryMonth
                    + " — record is already " + salaryRecord.getPaymentStatus()
                    + ". Reverse the payment/finalization first if a correction is needed.");
        }

        // ------------------------------------------------------------
        // FIX #2: Preserve any previously-set bonus instead of
        // resetting it to zero on every regeneration.
        // ------------------------------------------------------------
        BigDecimal bonus = salaryRecord.getBonus() != null
                ? salaryRecord.getBonus()
                : BigDecimal.ZERO;

        BigDecimal netSalary = monthlySalary
                .subtract(absenceDeduction)
                .subtract(statutoryDeductions)
                .add(overtimeAmount)
                .add(bonus)
                .setScale(2, RoundingMode.HALF_UP);

        if (netSalary.signum() < 0) {
            netSalary = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        salaryRecord.setEmployeeId(employee.getId());
        salaryRecord.setSalaryMonth(monthStart);
        salaryRecord.setMonthlySalary(monthlySalary);
        salaryRecord.setPayrollDivisor(divisor);

        /*
         * paidDays is informational.
         * The actual salary is based on monthly salary
         * minus absence and statutory deductions, plus overtime and bonus.
         */
        salaryRecord.setPaidDays(paidDays);

        salaryRecord.setOvertimeHours(overtimeHours);
        salaryRecord.setBasicSalary(monthlySalary);
        salaryRecord.setOvertimeAmount(overtimeAmount);
        salaryRecord.setBonus(bonus);
        salaryRecord.setDeductions(deductions);
        salaryRecord.setNetSalary(netSalary);

        if (salaryRecord.getPaymentMode() == null) {
            salaryRecord.setPaymentMode(
                    employee.getPaymentMode());
        }

        if (salaryRecord.getPaymentStatus() == null) {
            salaryRecord.setPaymentStatus("PENDING");
        }

        return salaryRecordRepository.save(salaryRecord);
    }

    private BigDecimal calculateAbsentDays(
            List<AttendanceRecord> records,
            PayrollRule payrollRule,
            LocalDate from,
            LocalDate to) {

        if (to.isBefore(from)) {
            return BigDecimal.ZERO.setScale(2);
        }

        BigDecimal absentDays = BigDecimal.ZERO;

        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {

            /*
             * Weekly off is not an absent day.
             */
            if (isWeeklyOff(date, payrollRule)) {
                continue;
            }

            AttendanceRecord attendance = findAttendanceForDate(
                    records,
                    date);

            /*
             * No attendance on a normal working day
             * is treated as unpaid/absent.
             */
            if (attendance == null) {
                absentDays = absentDays.add(BigDecimal.ONE);
                continue;
            }

            AttendanceStatus status = attendance.getStatus();

            if (status == AttendanceStatus.ABSENT
                    || status == AttendanceStatus.PENDING) {

                absentDays = absentDays.add(BigDecimal.ONE);
            }
        }

        return absentDays.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculatePaidDays(
            List<AttendanceRecord> records,
            PayrollRule payrollRule,
            LocalDate from,
            LocalDate to) {

        if (to.isBefore(from)) {
            return BigDecimal.ZERO.setScale(2);
        }

        BigDecimal paidDays = BigDecimal.ZERO;

        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {

            if (isWeeklyOff(date, payrollRule)) {

                if (Boolean.TRUE.equals(
                        payrollRule.getWeeklyOffPaid())) {

                    paidDays = paidDays.add(BigDecimal.ONE);
                }

                continue;
            }

            AttendanceRecord attendance =
                    findAttendanceForDate(records, date);

            if (attendance == null) {
                continue;
            }

            AttendanceStatus status = attendance.getStatus();

            if (status == AttendanceStatus.PRESENT
                    || status == AttendanceStatus.LATE
                    || status == AttendanceStatus.COMPLETED
                    || status == AttendanceStatus.PAID_LEAVE
                    || status == AttendanceStatus.HOLIDAY
                    || (status == AttendanceStatus.MISSING_CHECKOUT && attendance.getCheckInTime()!=null)
                    || (status == AttendanceStatus.WEEKLY_OFF && Boolean.TRUE.equals(payrollRule.getWeeklyOffPaid()))) {

                paidDays = paidDays.add(BigDecimal.ONE);
            }
        }

        return paidDays.setScale(2, RoundingMode.HALF_UP);
    }

    private boolean isWeeklyOff(
            LocalDate date,
            PayrollRule payrollRule) {

        if (payrollRule.getWeeklyOffDay() == null
                || payrollRule.getWeeklyOffDay().isBlank()) {

            return false;
        }

        DayOfWeek configuredDay;

        try {
            configuredDay = DayOfWeek.valueOf(
                    payrollRule.getWeeklyOffDay()
                            .trim()
                            .toUpperCase());
        } catch (IllegalArgumentException e) {
            return false;
        }

        return date.getDayOfWeek() == configuredDay;
    }

    private AttendanceRecord findAttendanceForDate(
            List<AttendanceRecord> records,
            LocalDate date) {

        for (AttendanceRecord record : records) {

            if (date.equals(record.getAttendanceDate())) {
                return record;
            }
        }

        return null;
    }

    private BigDecimal calculateOvertimeHours(
            List<AttendanceRecord> records) {

        BigDecimal total = BigDecimal.ZERO;

        for (AttendanceRecord record : records) {

            if (record.getOvertime() != null
                    && record.getOvertime() > 0) {

                total = total.add(
                        BigDecimal.valueOf(
                                record.getOvertime()));
            }
        }

        return total.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateOvertimeAmount(
            Employee employee,
            BigDecimal overtimeHours) {

        if (employee.getOtRate() == null
                || overtimeHours.signum() <= 0) {

            return BigDecimal.ZERO;
        }

        return employee.getOtRate()
                .multiply(overtimeHours)
                .setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * FIX #3: Statutory deductions, e.g. Provident Fund, as a
     * percentage of monthly salary configured per-firm via PayrollRule.
     * Returns ZERO if no percentage is configured (opt-in, backward compatible).
     */
    private BigDecimal calculateStatutoryDeductions(
            BigDecimal monthlySalary,
            PayrollRule payrollRule) {

        if (payrollRule.getProvidentFundPercent() == null
                || payrollRule.getProvidentFundPercent().signum() <= 0) {

            return BigDecimal.ZERO;
        }

        return monthlySalary
                .multiply(payrollRule.getProvidentFundPercent())
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    @Transactional
    public List<SalaryRecord> finalizePayroll(
            String firmCode,
            YearMonth salaryMonth) {

        if (firmCode == null || firmCode.isBlank()) {
            throw new IllegalArgumentException("Firm code is required.");
        }

        if (salaryMonth == null) {
            throw new IllegalArgumentException("Salary month is required.");
        }

        LocalDate monthStart = salaryMonth.atDay(1);

        List<SalaryRecord> salaryRecords =
                salaryRecordRepository
                        .findBySalaryMonthOrderByEmployeeIdAsc(monthStart);

        if (salaryRecords.isEmpty()) {
            throw new IllegalArgumentException(
                    "No salary records found for " + salaryMonth + ".");
        }

        List<SalaryRecord> finalizedRecords = new ArrayList<>();

        for (SalaryRecord salaryRecord : salaryRecords) {

            if ("PAID".equalsIgnoreCase(
                    salaryRecord.getPaymentStatus())) {

                throw new IllegalArgumentException(
                        "Payroll contains an already paid salary record. "
                        + "Employee ID: "
                        + salaryRecord.getEmployeeId());
            }

            // Only apply EMI deductions the first time this record is
            // finalized - never on a repeat finalize call for a record
            // that is already FINALIZED, to avoid double-charging loans.
            boolean alreadyFinalized =
                    "FINALIZED".equalsIgnoreCase(salaryRecord.getPaymentStatus());

            salaryRecord.setPaymentStatus("FINALIZED");

            if (!alreadyFinalized) {
                BigDecimal creditDeduction = creditService.applyPayrollDeductions(
                        salaryRecord.getEmployeeId(), salaryRecord.getId());

                if (creditDeduction.signum() > 0) {
                    salaryRecord.setDeductions(
                            salaryRecord.getDeductions()
                                    .add(creditDeduction)
                                    .setScale(2, RoundingMode.HALF_UP));

                    BigDecimal adjustedNet = salaryRecord.getNetSalary()
                            .subtract(creditDeduction)
                            .setScale(2, RoundingMode.HALF_UP);

                    salaryRecord.setNetSalary(
                            adjustedNet.signum() < 0
                                    ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                                    : adjustedNet);
                }
            }

            finalizedRecords.add(salaryRecord);
        }

        return salaryRecordRepository.saveAll(finalizedRecords);
    }

    public List<SalaryRecord> getFinalizedSalaries(LocalDate month) {
        return salaryRecordRepository.findBySalaryMonthAndPaymentStatus(
                month,
                "FINALIZED"
        );
    }

    public List<SalaryRecord> getAllPaymentRecords(String firmCode) {
        List<SalaryRecord> all = salaryRecordRepository.findAll();

        if (firmCode == null || firmCode.isBlank()) {
            return all;
        }

        Long firmId = firmRepository.findByCode(firmCode)
            .orElseThrow(() -> new IllegalArgumentException("Unknown firm code: " + firmCode))
            .getId();

        java.util.Set<Long> employeeIdsInFirm = employeeRepository.findByFirmId(firmId).stream()
            .map(Employee::getId)
            .collect(java.util.stream.Collectors.toSet());

        return all.stream()
            .filter(record -> employeeIdsInFirm.contains(record.getEmployeeId()))
            .toList();
    }

    @Transactional
    public SalaryRecord recordPayment(
            Long salaryRecordId,
            PaymentRequest request) {

        if (salaryRecordId == null) {
            throw new IllegalArgumentException(
                    "Salary record ID is required.");
        }

        if (request == null) {
            throw new IllegalArgumentException(
                    "Payment data is required.");
        }

        if (request.getPaymentMode() == null
                || request.getPaymentMode().isBlank()) {

            throw new IllegalArgumentException(
                    "Payment mode is required.");
        }

        if (request.getPaymentDate() == null) {
            throw new IllegalArgumentException(
                    "Payment date is required.");
        }

        SalaryRecord salaryRecord =
                salaryRecordRepository.findById(salaryRecordId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Salary record not found."));

        if (!"FINALIZED".equalsIgnoreCase(
                salaryRecord.getPaymentStatus())) {

            throw new IllegalArgumentException(
                    "Payment can only be recorded for a finalized salary.");
        }

        String paymentMode =
                request.getPaymentMode()
                        .trim()
                        .toUpperCase(java.util.Locale.ROOT);

        if (!paymentMode.equals("BANK_TRANSFER")
                && !paymentMode.equals("CASH")) {

            throw new IllegalArgumentException(
                    "Invalid payment mode. Use BANK_TRANSFER or CASH.");
        }

        salaryRecord.setPaymentMode(paymentMode);

        salaryRecord.setPaymentDate(
                request.getPaymentDate());

        salaryRecord.setTransactionReference(
                request.getTransactionReference());

        salaryRecord.setPaymentStatus("PAID");

        return salaryRecordRepository.save(salaryRecord);
    }

    /**
     * FIX #2: Sets/updates the bonus on an existing (not-yet-paid) salary
     * record, and recalculates net salary accordingly.
     */
    @Transactional
    public SalaryRecord setBonus(Long salaryRecordId, BigDecimal bonusAmount) {

        if (salaryRecordId == null) {
            throw new IllegalArgumentException("Salary record ID is required.");
        }

        if (bonusAmount == null || bonusAmount.signum() < 0) {
            throw new IllegalArgumentException("Bonus amount must be zero or positive.");
        }

        SalaryRecord salaryRecord = salaryRecordRepository.findById(salaryRecordId)
                .orElseThrow(() -> new IllegalArgumentException("Salary record not found."));

        if ("PAID".equalsIgnoreCase(salaryRecord.getPaymentStatus())) {
            throw new IllegalArgumentException(
                    "Cannot change bonus for a salary already marked as paid.");
        }

        BigDecimal roundedBonus = bonusAmount.setScale(2, RoundingMode.HALF_UP);

        BigDecimal previousBonus = salaryRecord.getBonus() != null
                ? salaryRecord.getBonus()
                : BigDecimal.ZERO;

        BigDecimal newNetSalary = salaryRecord.getNetSalary()
                .subtract(previousBonus)
                .add(roundedBonus)
                .setScale(2, RoundingMode.HALF_UP);

        if (newNetSalary.signum() < 0) {
            newNetSalary = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        salaryRecord.setBonus(roundedBonus);
        salaryRecord.setNetSalary(newNetSalary);

        return salaryRecordRepository.save(salaryRecord);
    }
}