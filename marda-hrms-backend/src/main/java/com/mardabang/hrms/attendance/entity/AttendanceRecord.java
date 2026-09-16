package com.mardabang.hrms.attendance.entity;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "attendance_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    private String firmCode;

    @Column(nullable = false)
    private String employeeCode;

    @Column(nullable = false)
    private String employeeName;

    @Column(nullable = false)
    private String department;


    @Column(nullable = false)
    private String shift;

    @Column(nullable = false)
    private LocalDate attendanceDate;
    
    @Column
    private Double checkOutLatitude;

    @Column
    private Double checkOutLongitude;

    @Column
    private LocalTime checkInTime;

    @Column
    private LocalTime checkOutTime;

    @Column
    private Double checkInLatitude;

    @Column
    private Double checkInLongitude;

    @Column
    private Double checkInAccuracy;

    @Column
    private String checkInVerificationSource;

    @Column
    private String checkOutVerificationSource;

    @Column
    private Double checkOutAccuracy;

    @Column(nullable = false)
    @Builder.Default
    private Double overtime = 0.0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AttendanceStatus status = AttendanceStatus.PENDING;

    @Column
    private String recordedBy;

    @Column
    private String notes;
}