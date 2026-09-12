package com.mardabang.hrms.employee.dto;

public record EmployeeDocument(String fileName, byte[] content, String contentType) {
}
