package com.mardabang.hrms.attendance.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AttendanceCheckoutRequest {

    @NotBlank(message = "Firm code is required.")
    private String firmCode;

    private String recordedBy;

    @DecimalMin(value = "-90.0", message = "Invalid checkout latitude.")
    @DecimalMax(value = "90.0", message = "Invalid checkout latitude.")
    private Double latitude;

    @DecimalMin(value = "0.0", message = "Location accuracy cannot be negative.")
    private Double accuracy;

    @DecimalMin(value = "-180.0", message = "Invalid checkout longitude.")
    @DecimalMax(value = "180.0", message = "Invalid checkout longitude.")
    private Double longitude;
}
