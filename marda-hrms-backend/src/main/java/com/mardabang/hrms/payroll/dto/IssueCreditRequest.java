package com.mardabang.hrms.payroll.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class IssueCreditRequest {

    @NotBlank
    private String employeeCode;

    @NotBlank
    private String firmCode;

    // "ADVANCE" or "LOAN"
    @NotBlank
    private String type;

    @NotNull
    @Positive
    private BigDecimal principalAmount;

    @NotNull
    @Positive
    private BigDecimal emiAmount;

    private String reason;
}