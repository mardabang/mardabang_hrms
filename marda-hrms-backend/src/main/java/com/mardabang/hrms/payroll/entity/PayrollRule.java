package com.mardabang.hrms.payroll.entity;

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
    name = "payroll_settings",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_payroll_settings_firm",
            columnNames = "firm_code"
        )
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(
        name = "firm_code",
        nullable = false,
        unique = true,
        length = 20
    )
    private String firmCode;

    @Column(
        name = "monthly_salary_divisor",
        nullable = false
    )
    @Builder.Default
    private Integer monthlySalaryDivisor = 26;

    @Column(
        name = "weekly_off_day",
        nullable = false,
        length = 20
    )
    @Builder.Default
    private String weeklyOffDay = "SUNDAY";

    @Column(
        name = "auto_fill_weekly_off",
        nullable = false
    )
    @Builder.Default
    private Boolean autoFillWeeklyOff = true;

    @Column(
        name = "weekly_off_paid",
        nullable = false
    )
    @Builder.Default
    private Boolean weeklyOffPaid = true;
    
    private java.math.BigDecimal providentFundPercent; // e.g. 12.00 means 12%
}