package com.mardabang.hrms.payroll.controller;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.mardabang.hrms.payroll.dto.CreditHistoryEntry;
import com.mardabang.hrms.payroll.dto.IssueCreditRequest;
import com.mardabang.hrms.payroll.dto.OutstandingSummary;
import com.mardabang.hrms.payroll.dto.RepaymentRequest;
import com.mardabang.hrms.payroll.entity.EmployeeCreditRecord;
import com.mardabang.hrms.payroll.service.CreditService;
import com.mardabang.hrms.user.entity.User;
import com.mardabang.hrms.user.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/payroll/credits")
@PreAuthorize("hasRole('ADMIN')")
public class CreditController {

    private final CreditService creditService;
    private final UserService userService;

    public CreditController(CreditService creditService, UserService userService) {
        this.creditService = creditService;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<EmployeeCreditRecord> issueCredit(@Valid @RequestBody IssueCreditRequest request,
                                                             Authentication authentication) {
        User admin = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
        return ResponseEntity.ok(creditService.issueCredit(request, admin.getId()));
    }

    @PutMapping("/{creditRecordId}/emi")
    public ResponseEntity<EmployeeCreditRecord> updateEmi(@PathVariable Long creditRecordId,
                                                           @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(creditService.updateEmi(creditRecordId, amount));
    }

    @PostMapping("/{creditRecordId}/repay")
    public ResponseEntity<EmployeeCreditRecord> repay(@PathVariable Long creditRecordId,
                                                       @Valid @RequestBody RepaymentRequest request) {
        return ResponseEntity.ok(
                creditService.recordManualRepayment(creditRecordId, request.getAmount(), request.getNotes()));
    }

    @GetMapping("/outstanding")
    public ResponseEntity<OutstandingSummary> getOutstanding(@RequestParam Long employeeId) {
        return ResponseEntity.ok(creditService.getOutstandingForEmployee(employeeId));
    }

    @GetMapping("/history")
    public ResponseEntity<List<CreditHistoryEntry>> getHistory(@RequestParam Long employeeId) {
        return ResponseEntity.ok(creditService.getHistoryForEmployee(employeeId));
    }
}