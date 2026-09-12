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
@Table(name = "employee_credit_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeCreditRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "firm_id", nullable = false)
    private Long firmId;

    // "ADVANCE" or "LOAN"
    @Column(name = "type", nullable = false, length = 20)
    private String type;

    @Column(name = "principal_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal principalAmount;

    @Column(name = "emi_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal emiAmount;

    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate;

    @Column(name = "reason", length = 255)
    private String reason;

    // "ACTIVE" or "CLOSED"
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;
}