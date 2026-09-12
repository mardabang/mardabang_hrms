package com.mardabang.hrms.payroll.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "credit_repayments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreditRepayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "credit_record_id", nullable = false)
    private Long creditRecordId;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "repayment_date", nullable = false)
    private LocalDate repaymentDate;

    // nullable - only set when repaid via automatic payroll deduction
    @Column(name = "salary_record_id")
    private Long salaryRecordId;

    // "PAYROLL_AUTO" or "MANUAL"
    @Column(name = "source", nullable = false, length = 20)
    private String source;

    @Column(name = "notes", length = 255)
    private String notes;
}