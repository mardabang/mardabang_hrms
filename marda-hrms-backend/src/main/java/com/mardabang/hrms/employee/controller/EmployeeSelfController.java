package com.mardabang.hrms.employee.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.mardabang.hrms.employee.dto.EmployeeDto;
import com.mardabang.hrms.employee.dto.EmployeeSelfUpdateRequest;
import com.mardabang.hrms.employee.service.EmployeeService;
import com.mardabang.hrms.user.entity.User;
import com.mardabang.hrms.user.service.UserService;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import com.mardabang.hrms.employee.dto.EmployeeDocument;

@RestController
@RequestMapping("/api/me")
public class EmployeeSelfController {

    private final EmployeeService employeeService;
    private final UserService userService;

    public EmployeeSelfController(EmployeeService employeeService, UserService userService) {
        this.employeeService = employeeService;
        this.userService = userService;
    }

    @GetMapping("/profile")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<EmployeeDto> getMyProfile(Authentication authentication) {
        String employeeCode = resolveEmployeeCode(authentication);
        EmployeeDto dto = employeeService.getEmployeeByCode(employeeCode);
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.notFound().build();
    }

    @PutMapping("/profile")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<?> updateMyProfile(Authentication authentication,
                                              @RequestBody EmployeeSelfUpdateRequest req) {
        String employeeCode = resolveEmployeeCode(authentication);
        try {
            return ResponseEntity.ok(employeeService.updateOwnProfile(employeeCode, req));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", ex.getMessage()));
        }
    }

    private String resolveEmployeeCode(Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
            .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
        if (user.getEmployeeCode() == null || user.getEmployeeCode().isBlank()) {
            throw new IllegalStateException("This account is not linked to an employee record.");
        }
        return user.getEmployeeCode();
    }
    
    @PostMapping(value = "/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<?> uploadMyPhoto(Authentication authentication,
                                            @RequestPart("photo") MultipartFile photo) {
        String employeeCode = resolveEmployeeCode(authentication);
        try {
            return ResponseEntity.ok(employeeService.uploadEmployeePhoto(employeeCode, photo));
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", ex.getMessage()));
        }
    }
    
    
    @GetMapping(value = "/photo", produces = {MediaType.IMAGE_JPEG_VALUE, MediaType.IMAGE_PNG_VALUE,
            MediaType.IMAGE_GIF_VALUE, MediaType.APPLICATION_OCTET_STREAM_VALUE})
    
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<?> getMyPhoto(Authentication authentication) {
    	String employeeCode = resolveEmployeeCode(authentication);
    	try {
    		EmployeeDocument document = employeeService.getEmployeePhoto(employeeCode);
    		return ResponseEntity.ok()
    				.contentType(MediaType.parseMediaType(document.contentType()))
    				.header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + document.fileName() + "\"")
    				.body(document.content());
    	} catch (RuntimeException ex) {
    		return ResponseEntity.notFound().build();
    	}
    }
}