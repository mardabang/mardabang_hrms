package com.mardabang.hrms.payroll.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "salary_records",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_salary_employee_month",
            columnNames = {"employee_id", "salary_month"}
        )
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalaryRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "salary_month", nullable = false)
    private LocalDate salaryMonth;

    @Column(name = "monthly_salary", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal monthlySalary = BigDecimal.ZERO;

    @Column(name = "payroll_divisor", nullable = false)
    @Builder.Default
    private Integer payrollDivisor = 26;

    @Column(name = "paid_days", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal paidDays = BigDecimal.ZERO;

    @Column(name = "overtime_hours", nullable = false, precision = 8, scale = 2)
    @Builder.Default
    private BigDecimal overtimeHours = BigDecimal.ZERO;

    @Column(name = "basic_salary", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal basicSalary = BigDecimal.ZERO;

    @Column(name = "overtime_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal overtimeAmount = BigDecimal.ZERO;

    @Column(name = "bonus", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal bonus = BigDecimal.ZERO;

    @Column(name = "deductions", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal deductions = BigDecimal.ZERO;

    @Column(name = "net_salary", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal netSalary = BigDecimal.ZERO;

    @Column(name = "payment_mode", length = 30)
    @Builder.Default
    private String paymentMode = "BANK_TRANSFER";

    @Column(name = "payment_status", nullable = false, length = 30)
    @Builder.Default
    private String paymentStatus = "PENDING";

    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @Column(name = "transaction_reference", length = 100)
    private String transactionReference;
}