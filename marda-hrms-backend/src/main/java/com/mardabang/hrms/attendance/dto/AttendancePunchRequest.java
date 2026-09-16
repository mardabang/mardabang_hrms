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
    private String shift;

    @NotBlank
    private String recordedBy;
    
    @NotBlank
    private String firmCode;

    @DecimalMin(value = "-90.0")
    @DecimalMax(value = "90.0")
    private Double latitude;

    @DecimalMin(value = "0.0", inclusive = false, message = "Location accuracy must be positive.")
    private Double accuracy;

    @DecimalMin(value = "-180.0")
    @DecimalMax(value = "180.0")
    private Double longitude;
}