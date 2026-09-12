package com.mardabang.hrms.payroll.service;

import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mardabang.hrms.payroll.entity.PayrollRule;
import com.mardabang.hrms.payroll.repository.PayrollRuleRepository;

@Service
public class PayrollRuleService {

    private final PayrollRuleRepository payrollRuleRepository;

    private static final Set<String> VALID_WEEKLY_OFF_DAYS = Set.of(
            "MONDAY",
            "TUESDAY",
            "WEDNESDAY",
            "THURSDAY",
            "FRIDAY",
            "SATURDAY",
            "SUNDAY"
    );

    public PayrollRuleService(PayrollRuleRepository payrollRuleRepository) {
        this.payrollRuleRepository = payrollRuleRepository;
    }

    @Transactional
    public PayrollRule getRules(String firmCode) {

        String normalizedFirmCode = validateFirmCode(firmCode);

        return payrollRuleRepository
                .findByFirmCode(normalizedFirmCode)
                .orElseGet(() -> createDefaultRules(normalizedFirmCode));
    }

    @Transactional
    public PayrollRule updateRules(
            String firmCode,
            PayrollRule request) {

        String normalizedFirmCode = validateFirmCode(firmCode);

        validateRules(request);

        PayrollRule payrollRule = payrollRuleRepository
                .findByFirmCode(normalizedFirmCode)
                .orElseGet(() -> PayrollRule.builder()
                        .firmCode(normalizedFirmCode)
                        .build());

        payrollRule.setMonthlySalaryDivisor(
                request.getMonthlySalaryDivisor());

        payrollRule.setWeeklyOffDay(
                request.getWeeklyOffDay()
                        .trim()
                        .toUpperCase(Locale.ROOT));

        payrollRule.setAutoFillWeeklyOff(
                request.getAutoFillWeeklyOff() != null
                        ? request.getAutoFillWeeklyOff()
                        : true);

        payrollRule.setWeeklyOffPaid(
                request.getWeeklyOffPaid() != null
                        ? request.getWeeklyOffPaid()
                        : true);

        return payrollRuleRepository.save(payrollRule);
    }

    private PayrollRule createDefaultRules(String firmCode) {

        PayrollRule payrollRule = PayrollRule.builder()
                .firmCode(firmCode)
                .monthlySalaryDivisor(26)
                .weeklyOffDay("SUNDAY")
                .autoFillWeeklyOff(true)
                .weeklyOffPaid(true)
                .build();

        return payrollRuleRepository.save(payrollRule);
    }

    private String validateFirmCode(String firmCode) {

        if (firmCode == null || firmCode.isBlank()) {
            throw new IllegalArgumentException(
                    "Firm code is required.");
        }

        return firmCode.trim().toUpperCase(Locale.ROOT);
    }

    private void validateRules(PayrollRule request) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Payroll rule data is required.");
        }

        Integer divisor = request.getMonthlySalaryDivisor();

        if (divisor == null || divisor < 1 || divisor > 31) {
            throw new IllegalArgumentException(
                    "Monthly salary divisor must be between 1 and 31.");
        }

        if (request.getWeeklyOffDay() == null
                || request.getWeeklyOffDay().isBlank()) {

            throw new IllegalArgumentException(
                    "Weekly off day is required.");
        }

        String weeklyOffDay = request.getWeeklyOffDay()
                .trim()
                .toUpperCase(Locale.ROOT);

        if (!VALID_WEEKLY_OFF_DAYS.contains(weeklyOffDay)) {
            throw new IllegalArgumentException(
                    "Invalid weekly off day: " + weeklyOffDay);
        }
    }
}