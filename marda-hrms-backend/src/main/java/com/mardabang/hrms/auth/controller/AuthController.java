package com.mardabang.hrms.auth.controller;

import java.util.List;
import java.util.Map;
import java.util.Objects;

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
import com.mardabang.hrms.auth.dto.RegisterRequest;
import com.mardabang.hrms.auth.dto.ResetPasswordRequest;
import com.mardabang.hrms.auth.security.JwtUtil;
import com.mardabang.hrms.auth.service.PasswordResetService;
import com.mardabang.hrms.employee.dto.EmployeeDto;
import com.mardabang.hrms.employee.service.EmployeeService;
import com.mardabang.hrms.firms.entity.Firm;
import com.mardabang.hrms.firms.repository.FirmRepository;
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
    private final PasswordResetService passwordResetService;
    private final FirmRepository firmRepository;

    public AuthController(
            UserService userService,
            JwtUtil jwtUtil,
            PasswordEncoder passwordEncoder,
            EmployeeService employeeService,
            PasswordResetService passwordResetService,
            FirmRepository firmRepository) {

        this.userService = userService;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
        this.employeeService = employeeService;
        this.passwordResetService = passwordResetService;
        this.firmRepository = firmRepository;
    }

    // ============================================================
    // REGISTER
    // ============================================================

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody RegisterRequest request) {

        String email = request.getEmail() == null
                ? null
                : request.getEmail().trim();

        String mobile = request.getMobile() == null
                ? null
                : request.getMobile().trim();

        String loginId = request.getLoginId() == null
                ? null
                : request.getLoginId().trim();

        String employeeCode = request.getEmployeeCode() == null
                ? null
                : request.getEmployeeCode().trim();

        Role role = request.getRole();
        if (role == null || email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Role and registered email are required."));
        }
        loginId = role == Role.ADMIN ? email : mobile;
        if (role != Role.ADMIN && (mobile == null || !mobile.matches("[6-9]\\d{9}"))) {
            return ResponseEntity.badRequest().body(Map.of("message", "Enter a valid registered 10-digit phone number."));
        }

        // ------------------------------------------------------------
        // Basic duplicate checks
        // ------------------------------------------------------------

        if (email != null && userService.emailExists(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Email already exists.");
        }

        if (mobile != null
                && !mobile.isBlank()
                && userService.mobileExists(mobile)) {

            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Mobile number already exists.");
        }

        // ------------------------------------------------------------
        // Login ID is required for every account
        // ------------------------------------------------------------

        if (loginId == null || loginId.isBlank()) {

            return ResponseEntity.badRequest()
                    .body("User ID is required.");
        }

        if (userService.loginIdExists(loginId)) {

            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("User ID already exists.");
        }

        // ------------------------------------------------------------
        // Password is required for every account
        // ------------------------------------------------------------

        if (request.getPassword() == null
                || request.getPassword().isBlank()) {

            return ResponseEntity.badRequest()
                    .body("Password is required.");
        }

        // ------------------------------------------------------------
        // Supervisor / Employee must have mobile
        // ------------------------------------------------------------

        if (role != Role.ADMIN
                && (mobile == null || mobile.isBlank())) {

            return ResponseEntity.badRequest()
                    .body(
                        "Mobile number is required for Supervisor and Employee accounts."
                    );
        }

        // ------------------------------------------------------------
        // Supervisor / Employee must be linked to an employee
        // ------------------------------------------------------------

        String finalEmployeeCode = employeeCode;

        Firm assignedFirm = null;

        if (role == Role.INPUTER) {

            // Supervisor must have a firm
            String firmCode = request.getFirmCode() == null
                    ? null
                    : request.getFirmCode().trim();

            if (firmCode == null || firmCode.isBlank()) {
                return ResponseEntity.badRequest()
                        .body("Firm is required for a Supervisor account.");
            }

            // Find the selected firm
            assignedFirm = firmRepository.findByCode(firmCode)
                    .orElse(null);

            if (assignedFirm == null) {
                return ResponseEntity.badRequest()
                        .body("Selected firm does not exist.");
            }

            // Only active firms can be assigned
            if (!Boolean.TRUE.equals(assignedFirm.getActive())) {
                return ResponseEntity.badRequest()
                        .body("Selected firm is inactive.");
            }

            if (finalEmployeeCode == null || finalEmployeeCode.isBlank()) {
                return ResponseEntity.badRequest()
                        .body("Employee code is required for a Supervisor account.");
            }

            EmployeeDto employee;
            try {
                employee = employeeService.getEmployeeByCode(finalEmployeeCode);
            } catch (RuntimeException exception) {
                return ResponseEntity.badRequest()
                        .body("Employee code does not exist.");
            }

            if (employee == null
                    || Boolean.FALSE.equals(employee.getActive())
                    || "Inactive".equalsIgnoreCase(employee.getStatus())) {
                return ResponseEntity.badRequest()
                        .body("The linked supervisor employee must be active.");
            }

            if (!Objects.equals(employee.getFirmId(), assignedFirm.getId())) {
                return ResponseEntity.badRequest()
                        .body("The linked employee must belong to the selected firm.");
            }

            if (userService.employeeCodeExists(finalEmployeeCode)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body("An account is already linked to this employee code.");
            }

        } else if (role == Role.EMPLOYEE) {

            // Employee must be linked to an employee code
            if (finalEmployeeCode == null
                    || finalEmployeeCode.isBlank()) {

                return ResponseEntity.badRequest()
                        .body("Employee code is required for an Employee account.");
            }

            EmployeeDto employee =
                    employeeService.getEmployeeByCode(finalEmployeeCode);

            if (employee == null) {
                return ResponseEntity.badRequest()
                        .body("Employee code does not exist.");
            }

            if (Boolean.FALSE.equals(employee.getActive())
                    || "Inactive".equalsIgnoreCase(employee.getStatus())) {

                return ResponseEntity.badRequest()
                        .body("The linked employee must be active.");
            }

            // Get the employee's firm
            if (employee.getFirmId() != null) {
                assignedFirm = firmRepository.findById(employee.getFirmId())
                        .orElse(null);
            }

            if (assignedFirm == null
                    || !Boolean.TRUE.equals(assignedFirm.getActive())) {

                return ResponseEntity.badRequest()
                        .body("The linked employee must belong to an active firm.");
            }

            // Employee code can only belong to one account
            if (userService.employeeCodeExists(finalEmployeeCode)) {

                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body("An account is already linked to this employee code.");
            }

        } else {

            // Admin does not have an employee code or firm requirement here
            finalEmployeeCode = null;
        }

        // ------------------------------------------------------------
        // Create user
        // ------------------------------------------------------------

        User user = User.builder()
                .fullName(request.getFullName().trim())
                .email(email)
                .mobile(mobile)
                .loginId(loginId)
                .employeeCode(finalEmployeeCode)
                .password(request.getPassword())
                .role(role)
                .active(true)
                .build();

        if (assignedFirm != null) {
            user.getFirms().add(assignedFirm);
        }

        userService.saveUser(user);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                    Map.of(
                        "message",
                        "User registered successfully.",
                        "loginId",
                        loginId
                    )
                );
    }

    // ============================================================
    // LOGIN
    // ============================================================

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request) {

        String loginId = request.getLoginId() == null
                ? ""
                : request.getLoginId().trim();

        User user = loginId.contains("@")
                ? userService.getUserByEmail(loginId).filter(u -> u.getRole() == Role.ADMIN).orElse(null)
                : userService.getUserByMobile(loginId)
                    .filter(u -> u.getRole() == Role.INPUTER || u.getRole() == Role.EMPLOYEE).orElse(null);

        if (user == null) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid email/phone number or password."));
        }

        if (!Boolean.TRUE.equals(user.getActive())) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid email/phone number or password."));
        }

        if (user.getPassword() == null
                || user.getPassword().isBlank()) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body("This account does not have a password.");
        }

        if (!passwordEncoder.matches(
                request.getPassword(),
                user.getPassword())) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid email/phone number or password."));
        }

        return ResponseEntity.ok(
                buildLoginResponse(user)
        );
    }

    // ============================================================
    // FORGOT PASSWORD
    // ============================================================

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {

        passwordResetService.forgotPassword(
                request.getEmail().trim()
        );

        /*
         * Same response whether the email exists or not.
         * This prevents account/email enumeration.
         */
        return ResponseEntity.ok(
                Map.of(
                    "message",
                    "If that email is registered, a password reset link has been sent."
                )
        );
    }

    // ============================================================
    // RESET PASSWORD
    // ============================================================

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        passwordResetService.resetPassword(
                request.getToken(),
                request.getNewPassword()
        );

        return ResponseEntity.ok(
                Map.of(
                    "message",
                    "Password updated. You can now log in."
                )
        );
    }

    // ============================================================
    // LOGIN RESPONSE
    // ============================================================

    private LoginResponse buildLoginResponse(User user) {

        /*
         * JWT subject is now the User ID / loginId,
         * not the email.
         */
        String token = jwtUtil.generateToken(
                user.getLoginId() == null || user.getLoginId().isBlank() ? user.getEmail() : user.getLoginId(),
                user.getRole().name()
        );

        List<String> firmCodes =
                user.getFirms()
                        .stream()
                        .map(Firm::getCode)
                        .toList();

        return new LoginResponse(
                token,
                user.getId(),
                user.getRole() == Role.ADMIN ? user.getEmail() : user.getMobile(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                user.getEmployeeCode(),
                firmCodes
        );
    }
}
