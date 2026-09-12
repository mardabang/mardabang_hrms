package com.mardabang.hrms.payroll.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mardabang.hrms.payroll.entity.PayrollRule;
import com.mardabang.hrms.payroll.repository.PayrollRuleRepository;

@Service
public class PayrollSettingsService {

    private final PayrollRuleRepository payrollRuleRepository;

    public PayrollSettingsService(PayrollRuleRepository payrollRuleRepository) {
        this.payrollRuleRepository = payrollRuleRepository;
    }

    /**
     * Get payroll rules for a firm.
     * If no settings exist yet, create default settings.
     */
    @Transactional
    public PayrollRule getPayrollRules(String firmCode) {

        if (firmCode == null || firmCode.isBlank()) {
            throw new IllegalArgumentException("Firm code is required.");
        }

        return payrollRuleRepository.findByFirmCode(firmCode)
                .orElseGet(() -> {

                    PayrollRule defaultRule = PayrollRule.builder()
                            .firmCode(firmCode)
                            .monthlySalaryDivisor(26)
                            .weeklyOffDay("SUNDAY")
                            .autoFillWeeklyOff(true)
                            .weeklyOffPaid(true)
                            .build();

                    return payrollRuleRepository.save(defaultRule);
                });
    }

    /**
     * Update payroll rules for a firm.
     */
    @Transactional
    public PayrollRule updatePayrollRules(
            String firmCode,
            Integer monthlySalaryDivisor,
            String weeklyOffDay,
            Boolean autoFillWeeklyOff,
            Boolean weeklyOffPaid) {

        if (firmCode == null || firmCode.isBlank()) {
            throw new IllegalArgumentException("Firm code is required.");
        }

        if (monthlySalaryDivisor == null
                || monthlySalaryDivisor < 1
                || monthlySalaryDivisor > 31) {

            throw new IllegalArgumentException(
                    "Monthly salary divisor must be between 1 and 31.");
        }

        if (weeklyOffDay == null || weeklyOffDay.isBlank()) {
            throw new IllegalArgumentException(
                    "Weekly off day is required.");
        }

        PayrollRule rule = payrollRuleRepository
                .findByFirmCode(firmCode)
                .orElseGet(() -> PayrollRule.builder()
                        .firmCode(firmCode)
                        .build());

        rule.setMonthlySalaryDivisor(monthlySalaryDivisor);
        rule.setWeeklyOffDay(weeklyOffDay.toUpperCase());
        rule.setAutoFillWeeklyOff(
                autoFillWeeklyOff != null
                        ? autoFillWeeklyOff
                        : true
        );
        rule.setWeeklyOffPaid(
                weeklyOffPaid != null
                        ? weeklyOffPaid
                        : true
        );

        return payrollRuleRepository.save(rule);
    }
}