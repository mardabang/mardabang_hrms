package com.mardabang.hrms.employee.controller;

import java.nio.charset.StandardCharsets;
import java.util.List;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.mardabang.hrms.attendance.repository.AttendanceRepository;
import com.mardabang.hrms.employee.dto.EmployeeDocument;
import com.mardabang.hrms.employee.dto.EmployeeDto;
import com.mardabang.hrms.employee.dto.EmployeeImportResult;
import com.mardabang.hrms.employee.service.EmployeeService;
import com.mardabang.hrms.firms.repository.FirmRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;
    private final FirmRepository firmRepository;
    

 // EmployeeController.java
    @GetMapping
    public ResponseEntity<List<EmployeeDto>> getAllEmployees(
            @RequestParam(required = false) String firmCode) {
        Long firmId = null;
        if (firmCode != null) {
            firmId = firmRepository.findByCode(firmCode)
                .orElseThrow(() -> new IllegalArgumentException("Unknown firm code: " + firmCode))
                .getId();
        }
        return ResponseEntity.ok(employeeService.getAllEmployees(firmId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmployeeDto> getEmployeeById(@PathVariable Long id) {
        EmployeeDto employee = employeeService.getEmployeeById(id);
        return employee != null ? ResponseEntity.ok(employee) : ResponseEntity.notFound().build();
    }

    @GetMapping("/code/{employeeCode}")
    public ResponseEntity<EmployeeDto> getEmployeeByCode(@PathVariable String employeeCode) {
        EmployeeDto employee = employeeService.getEmployeeByCode(employeeCode);
        return employee != null ? ResponseEntity.ok(employee) : ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<EmployeeDto> createEmployee(@RequestBody EmployeeDto employeeDto) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(employeeService.createEmployee(employeeDto));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @PostMapping(value = "/with-documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createEmployeeWithDocuments(
            @RequestPart("employee") EmployeeDto employeeDto,
            @RequestPart("aadharDocument") MultipartFile aadharDocument,
            @RequestPart("panDocument") MultipartFile panDocument) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(employeeService.createEmployeeWithDocuments(employeeDto, aadharDocument, panDocument));
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping(value = "/code/{employeeCode}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadEmployeePhoto(
            @PathVariable String employeeCode,
            @RequestPart("photo") MultipartFile photo) {
        try {
            return ResponseEntity.ok(employeeService.uploadEmployeePhoto(employeeCode, photo));
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping(value = "/code/{employeeCode}/photo", produces = {MediaType.IMAGE_JPEG_VALUE, MediaType.IMAGE_PNG_VALUE, MediaType.IMAGE_GIF_VALUE, MediaType.APPLICATION_OCTET_STREAM_VALUE})
    public ResponseEntity<?> getEmployeePhoto(@PathVariable String employeeCode) {
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

    @PostMapping("/import")
    public ResponseEntity<?> importEmployees(@RequestBody List<EmployeeDto> employees) {
        try {
            EmployeeImportResult result = employeeService.importEmployees(employees);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmployeeDto> updateEmployee(@PathVariable Long id, @RequestBody EmployeeDto employeeDto) {
        try {
            return ResponseEntity.ok(employeeService.updateEmployee(id, employeeDto));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/code/{employeeCode}")
    public ResponseEntity<EmployeeDto> updateEmployeeByCode(@PathVariable String employeeCode, @RequestBody EmployeeDto employeeDto) {
        try {
            return ResponseEntity.ok(employeeService.updateEmployeeByCode(employeeCode, employeeDto));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.notFound().build();
        }
    }
    
    
    
    @PutMapping("/code/{employeeCode}/status")
    public ResponseEntity<EmployeeDto> updateEmployeeStatus(
            @PathVariable String employeeCode,
            @RequestParam boolean active) {

        return ResponseEntity.ok(
                employeeService.updateEmployeeStatus(employeeCode, active)
        );
    }
    
    @PutMapping("/{employeeId}/reassign-code")
    public ResponseEntity<?> reassignEmployeeCode(
            @PathVariable Long employeeId,
            @RequestParam String newEmployeeCode) {
        try {
            return ResponseEntity.ok(
                    employeeService.reassignEmployeeCode(employeeId, newEmployeeCode));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping(value = "/code/{employeeCode}/with-documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateEmployeeWithDocuments(
            @PathVariable String employeeCode,
            @RequestPart("employee") EmployeeDto employeeDto,
            @RequestPart(value = "aadharDocument", required = false) MultipartFile aadharDocument,
            @RequestPart(value = "panDocument", required = false) MultipartFile panDocument) {
        try {
            return ResponseEntity.ok(employeeService.updateEmployeeWithDocuments(
                employeeCode, employeeDto, aadharDocument, panDocument));
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping(value = "/code/{employeeCode}/documents/{documentType}", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<?> downloadEmployeeDocument(
            @PathVariable String employeeCode,
            @PathVariable String documentType) {
        try {
            EmployeeDocument document = employeeService.getEmployeeDocument(employeeCode, documentType);
            String fileName = document.fileName() == null ? documentType + ".pdf" : document.fileName();
            ContentDisposition disposition = ContentDisposition.attachment()
                .filename(fileName, StandardCharsets.UTF_8)
                .build();
            return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(document.content());
        } catch (RuntimeException ex) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmployee(@PathVariable Long id) {
        employeeService.deleteEmployee(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/code/{employeeCode}")
    public ResponseEntity<Void> deleteEmployeeByCode(@PathVariable String employeeCode) {
        employeeService.deleteEmployeeByCode(employeeCode);
        return ResponseEntity.noContent().build();
    }
    
    
    
}
