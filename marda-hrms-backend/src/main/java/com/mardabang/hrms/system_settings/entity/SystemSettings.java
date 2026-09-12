package com.mardabang.hrms.system_settings.entity;

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
    name = "system_settings",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_system_settings_firm",
            columnNames = "firm_code"
        )
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemSettings {

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
        name = "grace_period",
        nullable = false
    )
    @Builder.Default
    private Integer gracePeriod = 10;

    @Column(
        name = "attendance_reminders",
        nullable = false
    )
    @Builder.Default
    private Boolean attendanceReminders = true;

    @Column(
        name = "payroll_alerts",
        nullable = false
    )
    @Builder.Default
    private Boolean payrollAlerts = true;

    @Column(
        name = "date_format",
        nullable = false,
        length = 20
    )
    @Builder.Default
    private String dateFormat = "DD/MM/YYYY";

    @Column(
        name = "currency",
        nullable = false,
        length = 20
    )
    @Builder.Default
    private String currency = "INR (₹)";

    @Column(
        name = "dark_theme",
        nullable = false
    )
    @Builder.Default
    private Boolean darkTheme = false;
}