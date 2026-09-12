package com.mardabang.hrms.employee.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EmployeeRegistrationRequest {
    @NotNull
    @Valid
    private EmployeeDto employee;

    // optional — if blank, a temp password is generated and returned once
    private String password;
}