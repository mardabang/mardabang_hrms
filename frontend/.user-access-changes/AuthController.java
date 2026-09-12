package com.mardabang.hrms.auth.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mardabang.hrms.auth.dto.ForgotPasswordRequest;
import com.mardabang.hrms.auth.dto.LoginRequest;
import com.mardabang.hrms.auth.dto.LoginResponse;
import com.mardabang.hrms.auth.dto.OtpRequest;
import com.mardabang.hrms.auth.dto.OtpVerifyRequest;
import com.mardabang.hrms.auth.dto.RegisterRequest;
import com.mardabang.hrms.auth.dto.ResetPasswordRequest;
import com.mardabang.hrms.auth.security.JwtUtil;
import com.mardabang.hrms.auth.service.OtpService;
import com.mardabang.hrms.auth.service.PasswordResetService;
import com.mardabang.hrms.employee.service.EmployeeService;
import com.mardabang.hrms.employee.dto.EmployeeDto;
import com.mardabang.hrms.firms.repository.FirmRepository;
import com.mardabang.hrms.firms.entity.Firm;
import com.mardabang.hrms.user.entity.Role;
import com.mardabang.hrms.user.entity.User;
import com.mardabang.hrms.user.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final EmployeeService employeeService;
    private final OtpService otpService;
    private final PasswordResetService passwordResetService;
    private final FirmRepository firmRepository;

    public AuthController(UserService userService,
                          JwtUtil jwtUtil,
                          PasswordEncoder passwordEncoder,
                          EmployeeService employeeService,
                          OtpService otpService,
                          PasswordResetService passwordResetService,
                          FirmRepository firmRepository) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
        this.employeeService = employeeService;
        this.otpService = otpService;
        this.passwordResetService = passwordResetService;
        this.firmRepository = firmRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {

        if (userService.emailExists(request.getEmail())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Email already exists.");
        }
        if (request.getMobile() != null && !request.getMobile().isBlank()
                && userService.mobileExists(request.getMobile())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Mobile number already exists.");
        }

        Role role = request.getRole();

        // Supervisor and Employee accounts log in via mobile + OTP only, so a
        // mobile number is mandatory for them (it was previously optional for everyone).
        if (role != Role.ADMIN && (request.getMobile() == null || request.getMobile().isBlank())) {
            return ResponseEntity.badRequest().body("Mobile number is required for Supervisor and Employee accounts.");
        }

        // Only Admin accounts use a password; enforce that manually since the
        // DTO no longer requires @NotBlank on password (Supervisor/Employee
        // accounts never supply one).
        if (role == Role.ADMIN && (request.getPassword() == null || request.getPassword().isBlank())) {
            return ResponseEntity.badRequest().body("Password is required for Admin accounts.");
        }

        // Both Supervisor and Employee accounts must link to a real employee
        // record — this previously only applied to INPUTER (Supervisor),
        // which meant Employee accounts had no employeeCode linkage at all.
        String employeeCode = request.getEmployeeCode() == null
                ? null : request.getEmployeeCode().trim();
        Firm assignedFirm = null;
        if (role == Role.INPUTER || role == Role.EMPLOYEE) {
            if (employeeCode == null || employeeCode.isBlank()) {
                return ResponseEntity.badRequest().body("Employee code is required for a Supervisor or Employee account.");
            }
            EmployeeDto employee = employeeService.getEmployeeByCode(employeeCode);
            if (employee == null) {
                return ResponseEntity.badRequest().body("Employee code does not exist.");
            }
            if (Boolean.FALSE.equals(employee.getActive()) || "Inactive".equalsIgnoreCase(employee.getStatus())) {
                return ResponseEntity.badRequest().body("The linked employee must be active.");
            }
            assignedFirm = employee.getFirmId() == null ? null : firmRepository.findById(employee.getFirmId()).orElse(null);
            if (assignedFirm == null || !Boolean.TRUE.equals(assignedFirm.getActive())) {
                return ResponseEntity.badRequest().body("The linked employee must belong to an active firm.");
            }
            if (userService.employeeCodeExists(employeeCode)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body("An account is already linked to this employee code.");
            }
        } else {
            employeeCode = null;
        }

        // Supervisor/Employee accounts never log in with a password, so a
        // random unguessable value fills the (presumably NOT NULL) column;
        // it is never surfaced and cannot be used to log in via /login.
        String rawPassword = (role == Role.ADMIN) ? request.getPassword() : UUID.randomUUID().toString();

        User user = User.builder()
                .fullName(request.getFullName().trim())
                .email(request.getEmail().trim())
                .mobile(request.getMobile())
                .employeeCode(employeeCode)
                .password(rawPassword)
                .role(role)
                .active(true)
                .build();

        if (assignedFirm != null) user.getFirms().add(assignedFirm);
        userService.saveUser(user);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body("User registered successfully.");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {

        User user = userService.getUserByEmail(request.getEmail())
                .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid email or password.");
        }

        if (!Boolean.TRUE.equals(user.getActive())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid email or password.");
        }

        // Password login is Admin-only now; Supervisor/Employee accounts hold
        // a random, never-disclosed password value and must use /otp/request
        // + /otp/verify instead.
        if (user.getRole() != Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("This account signs in with a mobile OTP, not a password.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid email or password.");
        }

        return ResponseEntity.ok(buildLoginResponse(user));
    }

    @PostMapping("/otp/request")
    public ResponseEntity<?> requestOtp(@Valid @RequestBody OtpRequest request) {
        otpService.requestOtp(request.getMobile());
        // Always the same response, whether or not the number is registered —
        // avoids letting someone probe which numbers have accounts.
        return ResponseEntity.ok(Map.of("message", "If this number is registered, a code has been sent."));
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        User user = otpService.verifyOtp(request.getMobile(), request.getCode());
        return ResponseEntity.ok(buildLoginResponse(user));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.forgotPassword(request.getEmail());
        // Same response regardless of whether the email exists or is an Admin account.
        return ResponseEntity.ok(Map.of("message", "If that email belongs to an Admin account, a reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Password updated. You can now log in."));
    }

    private LoginResponse buildLoginResponse(User user) {
        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());

        List<String> firmCodes = user.getFirms().stream()
                .map(Firm::getCode)
                .toList();

        return new LoginResponse(
                token,
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                user.getEmployeeCode(),
                firmCodes
        );
    }
}
