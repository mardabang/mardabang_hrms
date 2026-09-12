package com.mardabang.hrms.payroll.controller;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.mardabang.hrms.payroll.dto.PaymentRequest;
import com.mardabang.hrms.payroll.entity.SalaryRecord;
import com.mardabang.hrms.payroll.service.SalaryRecordService;

@RestController
@RequestMapping("/api/payroll")
public class PayrollController {

    private final SalaryRecordService salaryRecordService;

    public PayrollController(
            SalaryRecordService salaryRecordService) {
        this.salaryRecordService = salaryRecordService;
    }

    @PostMapping("/generate")
    public ResponseEntity<SalaryRecord> generateSalary(
            @RequestParam String employeeCode,
            @RequestParam String firmCode,
            @RequestParam String month) {

        YearMonth salaryMonth;
        try {
            salaryMonth = YearMonth.parse(month);
        } catch (Exception e) {
            throw new IllegalArgumentException(
                    "Invalid month format. Use YYYY-MM, for example 2026-09.");
        }

        SalaryRecord salaryRecord =
                salaryRecordService.generateSalary(
                        employeeCode,
                        firmCode,
                        salaryMonth);

        return ResponseEntity.ok(salaryRecord);
    }

    @PutMapping("/finalize")
    public ResponseEntity<List<SalaryRecord>> finalizePayroll(
            @RequestParam String firmCode,
            @RequestParam String month) {

        YearMonth salaryMonth;
        try {
            salaryMonth = YearMonth.parse(month);
        } catch (Exception e) {
            throw new IllegalArgumentException(
                    "Invalid month format. Use YYYY-MM, for example 2026-09.");
        }

        List<SalaryRecord> finalizedRecords =
                salaryRecordService.finalizePayroll(
                        firmCode,
                        salaryMonth);

        return ResponseEntity.ok(finalizedRecords);
    }

    @GetMapping("/finalized")
    public List<SalaryRecord> getFinalizedSalaries(
            @RequestParam LocalDate month) {
        return salaryRecordService.getFinalizedSalaries(month);
    }

    /*
     * Get all salary records for the Payment page.
     */
    @GetMapping("/payments")
    public ResponseEntity<List<SalaryRecord>> getPaymentRecords(
            @RequestParam(required = false) String firmCode) {
        return ResponseEntity.ok(
                salaryRecordService.getAllPaymentRecords(firmCode)
        );
    }

    /*
     * Record a payment for a finalized salary.
     */
    @PutMapping("/{salaryRecordId}/pay")
    public ResponseEntity<SalaryRecord> recordPayment(
            @PathVariable Long salaryRecordId,
            @RequestBody PaymentRequest request) {

        SalaryRecord updatedRecord =
                salaryRecordService.recordPayment(
                        salaryRecordId,
                        request);

        return ResponseEntity.ok(updatedRecord);
    }

    /*
     * FIX #2: Set or update the bonus for a salary record
     * (not yet paid). Recalculates net salary.
     */
    @PutMapping("/{salaryRecordId}/bonus")
    public ResponseEntity<SalaryRecord> setBonus(
            @PathVariable Long salaryRecordId,
            @RequestParam BigDecimal amount) {

        return ResponseEntity.ok(
                salaryRecordService.setBonus(salaryRecordId, amount));
    }
}