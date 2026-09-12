package com.mardabang.hrms.attendance.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AttendanceCheckoutRequest {

    @NotBlank(message = "Firm code is required.")
    private String firmCode;

    @NotBlank(message = "Recorded by is required.")
    private String recordedBy;

    @NotNull(message = "Checkout latitude is required.")
    @DecimalMin(value = "-90.0", message = "Invalid checkout latitude.")
    @DecimalMax(value = "90.0", message = "Invalid checkout latitude.")
    private Double latitude;

    @NotNull(message = "Checkout longitude is required.")
    @DecimalMin(value = "-180.0", message = "Invalid checkout longitude.")
    @DecimalMax(value = "180.0", message = "Invalid checkout longitude.")
    private Double longitude;
}