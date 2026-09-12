package com.mardabang.hrms.auth.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class LoginResponse {

    private String token;
    private Long userId;
    private String email;
    private String fullName;
    private String role;
    private String employeeCode;
    private List<String> firms;
}
