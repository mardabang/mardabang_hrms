package com.mardabang.hrms.payroll.dto;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Getter;

// Shape matches exactly what Reports.jsx's ledgerSummary expects: advance, loan, outstanding
@Getter
@AllArgsConstructor
public class OutstandingSummary {
    private BigDecimal advance;
    private BigDecimal loan;
    private BigDecimal outstanding;
}