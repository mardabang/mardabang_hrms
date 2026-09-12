package com.mardabang.hrms.backup.controller;

import com.mardabang.hrms.backup.dto.BackupRequest;
import com.mardabang.hrms.backup.entity.BackupHistory;
import com.mardabang.hrms.backup.service.BackupService;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/backup")
@CrossOrigin
public class BackupController {

    private final BackupService service;

    public BackupController(BackupService service) {
        this.service = service;
    }

    @PostMapping("/create")
    public ResponseEntity<String> createBackup(@RequestBody BackupRequest request) {
        try {
            return ResponseEntity.ok(
                    service.createBackup(request.getFirmCode(), request.getNote())
            );
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @GetMapping("/list")
    public List<BackupHistory> listBackups() {
        return service.listBackups();
    }
    
    @PostMapping("/restore")
    public ResponseEntity<String> restoreBackup(
            @RequestParam("file") MultipartFile file,
            @RequestParam("firmCode") String firmCode
    ) {
        try {
            return ResponseEntity.ok(service.restoreBackup(file, firmCode));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}