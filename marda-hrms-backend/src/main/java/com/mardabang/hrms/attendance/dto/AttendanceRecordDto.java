package com.mardabang.hrms.attendance.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AttendanceRecordDto {

    private Long id;
    private String employeeCode;
    private String employeeName;
    private String department;
    private String shift;
    private LocalDate attendanceDate;
    private LocalTime checkInTime;
    private LocalTime checkOutTime;
    private String status;
    private String recordedBy;
    private Double latitude;
    private Double longitude;
}
