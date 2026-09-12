package com.mardabang.hrms.attendance.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AttendancePunchRequest {

    @NotBlank
    private String employeeCode;

    @NotBlank
    private String employeeName;

    @NotBlank
    private String department;

    @NotBlank
    private String team;

    @NotBlank
    private String shift;

    @NotBlank
    private String recordedBy;
    
    @NotBlank
    private String firmCode;

    @NotNull
    @DecimalMin(value = "-90.0")
    @DecimalMax(value = "90.0")
    private Double latitude;

    @NotNull
    @DecimalMin(value = "-180.0")
    @DecimalMax(value = "180.0")
    private Double longitude;
}