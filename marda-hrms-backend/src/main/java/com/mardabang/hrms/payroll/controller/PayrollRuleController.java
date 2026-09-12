package com.mardabang.hrms.payroll.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mardabang.hrms.payroll.entity.PayrollRule;
import com.mardabang.hrms.payroll.service.PayrollRuleService;

@RestController
@RequestMapping("/api/settings/payroll")
public class PayrollRuleController {

    private final PayrollRuleService payrollRuleService;

    public PayrollRuleController(PayrollRuleService payrollRuleService) {
        this.payrollRuleService = payrollRuleService;
    }

    @GetMapping
    public ResponseEntity<PayrollRule> getPayrollRules(
            @RequestParam String firmCode) {

        return ResponseEntity.ok(
                payrollRuleService.getRules(firmCode)
        );
    }

    @PutMapping
    public ResponseEntity<PayrollRule> updatePayrollRules(
            @RequestParam String firmCode,
            @RequestBody PayrollRule request) {

        return ResponseEntity.ok(
                payrollRuleService.updateRules(firmCode, request)
        );
    }
}