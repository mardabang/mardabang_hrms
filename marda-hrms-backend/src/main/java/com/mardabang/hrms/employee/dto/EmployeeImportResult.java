package com.mardabang.hrms.employee.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class EmployeeImportResult {
    private int total;
    private int created;
    private int updated;
    private List<EmployeeDto> employees;
}
