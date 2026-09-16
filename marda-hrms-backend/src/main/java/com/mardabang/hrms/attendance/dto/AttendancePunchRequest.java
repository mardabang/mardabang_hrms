package com.mardabang.hrms.attendance.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AttendancePunchRequest {

    @NotBlank
    private String employeeCode;

    private String employeeName;

    private String department;

    private String shift;

    private String recordedBy;
    
    @NotBlank
    private String firmCode;

    @DecimalMin(value = "-90.0")
    @DecimalMax(value = "90.0")
    private Double latitude;

    @DecimalMin(value = "0.0", message = "Location accuracy cannot be negative.")
    private Double accuracy;

    @DecimalMin(value = "-180.0")
    @DecimalMax(value = "180.0")
    private Double longitude;
}
