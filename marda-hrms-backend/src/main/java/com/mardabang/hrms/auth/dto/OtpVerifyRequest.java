package com.mardabang.hrms.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class OtpVerifyRequest {

    @NotBlank
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Enter a valid 10-digit mobile number")
    private String mobile;

    @NotBlank
    @Pattern(regexp = "^\\d{6}$", message = "Enter the 6-digit code")
    private String code;
}