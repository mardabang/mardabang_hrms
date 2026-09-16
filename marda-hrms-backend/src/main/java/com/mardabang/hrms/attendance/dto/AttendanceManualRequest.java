package com.mardabang.hrms.attendance.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AttendanceManualRequest {

    private String firmCode;

    private String employeeCode;

    private String employeeName;

    private String department;


    private String shift;

    private LocalDate attendanceDate;

    private LocalTime checkInTime;

    private LocalTime checkOutTime;

    private Double overtime;

    private String status;

    private String recordedBy;

    private String notes;

    /*
     * GPS is optional for manual/admin attendance.
     *
     * Admin/Supervisor manual checkout does NOT require GPS.
     * These fields are kept optional so existing manual attendance
     * functionality continues to work.
     */
    private Double latitude;

    private Double longitude;
}