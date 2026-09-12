package com.mardabang.hrms.payroll.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Getter;

// One row in the ledger history - either an issuance or a repayment event
@Getter
@AllArgsConstructor
public class CreditHistoryEntry {
    private Long id;
    private String type;        // "ADVANCE_ISSUED", "LOAN_ISSUED", "REPAYMENT"
    private LocalDate date;
    private BigDecimal amount;
    private String description;
    private String source;      // null for issuance rows; "PAYROLL_AUTO" or "MANUAL" for repayments
}