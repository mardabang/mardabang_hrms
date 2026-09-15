package com.mardabang.hrms.auth.dto;

import com.mardabang.hrms.user.entity.Role;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {

    @NotBlank
    @Size(min = 2, max = 100)
    private String fullName;

    @Email
    @NotBlank
    private String email;

    @Pattern(
        regexp = "^$|^[6-9]\\d{9}$",
        message = "Enter a valid 10-digit Indian mobile number without +91"
    )
    private String mobile;

    private String employeeCode;

    private String loginId;

    @Size(
        min = 12,
        max = 128,
        message = "Password must be between 12 and 128 characters"
    )
    private String password;

    @NotNull(message = "Role is required")
    private Role role;
    
    private String firmCode;
}