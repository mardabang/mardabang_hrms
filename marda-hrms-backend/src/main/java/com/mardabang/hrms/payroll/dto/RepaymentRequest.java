package com.mardabang.hrms.payroll.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RepaymentRequest {

    @NotNull
    @Positive
    private BigDecimal amount;

    private String notes;
}