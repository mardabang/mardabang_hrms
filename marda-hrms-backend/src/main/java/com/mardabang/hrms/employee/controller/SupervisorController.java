package com.mardabang.hrms.employee.controller;

import java.security.SecureRandom;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.mardabang.hrms.employee.dto.EmployeeDto;
import com.mardabang.hrms.employee.dto.EmployeeRegistrationRequest;
import com.mardabang.hrms.employee.service.EmployeeService;
import com.mardabang.hrms.firms.entity.Firm;
import com.mardabang.hrms.user.entity.Role;
import com.mardabang.hrms.user.entity.User;
import com.mardabang.hrms.user.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/supervisor")
public class SupervisorController {

    private final EmployeeService employeeService;
    private final UserService userService;
    private static final SecureRandom RANDOM = new SecureRandom();

    public SupervisorController(EmployeeService employeeService, UserService userService) {
        this.employeeService = employeeService;
        this.userService = userService;
    }

    @PostMapping("/employees")
    @PreAuthorize("hasAnyRole('ADMIN','INPUTER')")
    public ResponseEntity<?> registerEmployee(@Valid @RequestBody EmployeeRegistrationRequest request,
                                               Authentication authentication) {
        EmployeeDto dto = request.getEmployee();

        if (dto.getEmail() == null || dto.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body("Employee email is required to create a login account.");
        }
        if (dto.getContact() == null || !dto.getContact().trim().matches("[6-9]\\d{9}")) {
            return ResponseEntity.badRequest().body("A valid 10-digit employee phone number is required.");
        }
        dto.setContact(dto.getContact().trim());
        if (userService.mobileExists(dto.getContact()) || userService.loginIdExists(dto.getContact())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("An account already exists for this phone number.");
        }
        if (userService.emailExists(dto.getEmail())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("A login account already exists for this email.");
        }

        User creator = userService.getUserByPrincipal(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));

        // Derive firmId from the creator instead of trusting client input
        if (creator.getFirms() == null || creator.getFirms().isEmpty()) {
            return ResponseEntity.badRequest().body("Supervisor is not assigned to any firm.");
        }
        Firm creatorFirm = creator.getFirms().stream()
                .filter(f -> dto.getFirmId()==null || f.getId().equals(dto.getFirmId()))
                .findFirst().orElseThrow(() -> new IllegalArgumentException("Selected company is not assigned to this supervisor."));
        dto.setFirmId(creatorFirm.getId());

        // 1. Create the HR record (reuses all existing validation)
        EmployeeDto savedEmployee = employeeService.createEmployee(dto);
        employeeService.setCreatedBy(savedEmployee.getEmployeeCode(), creator.getId());

        // 2. Create the linked login account
        String rawPassword = (request.getPassword() == null || request.getPassword().isBlank())
                ? generateTempPassword()
                : request.getPassword();

        User employeeUser = User.builder()
                .fullName(dto.getName())
                .email(dto.getEmail())
                .mobile(dto.getContact())
                .loginId(dto.getContact())
                .employeeCode(savedEmployee.getEmployeeCode())
                .password(rawPassword) // hashed inside userService.saveUser
                .role(Role.EMPLOYEE)
                .active(true)
                .firms(new HashSet<>(Set.of(creatorFirm)))
                .build();
        userService.saveUser(employeeUser);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Employee and login account created.",
                "employeeCode", savedEmployee.getEmployeeCode(),
                "email", dto.getEmail(),
                "tempPassword", rawPassword // shown once - supervisor shares this with the employee
        ));
    }

    @GetMapping("/employees")
    @PreAuthorize("hasAnyRole('ADMIN','INPUTER')")
    public ResponseEntity<?> myEmployees(Authentication authentication) {
        User creator = userService.getUserByPrincipal(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
        return ResponseEntity.ok(employeeService.getEmployeesCreatedBy(creator.getId()));
    }

    private String generateTempPassword() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 14; i++) {
            sb.append(chars.charAt(RANDOM.nextInt(chars.length())));
        }
        return sb.toString();
    }
}