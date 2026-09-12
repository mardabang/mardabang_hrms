package com.mardabang.hrms.system_settings.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mardabang.hrms.system_settings.entity.SystemSettings;
import com.mardabang.hrms.system_settings.service.SystemSettingService;

@RestController
@RequestMapping("/api/settings/system")
public class SystemSettingController {

    private final SystemSettingService systemSettingService;

    public SystemSettingController(
            SystemSettingService systemSettingService) {

        this.systemSettingService = systemSettingService;
    }

    @GetMapping
    public ResponseEntity<SystemSettings> getSystemSettings(
            @RequestParam String firmCode) {

        return ResponseEntity.ok(
                systemSettingService.getSystemSettings(firmCode)
        );
    }

    @PutMapping
    public ResponseEntity<SystemSettings> updateSystemSettings(
            @RequestParam String firmCode,
            @RequestBody SystemSettings request) {

        SystemSettings updatedSettings =
                systemSettingService.updateSystemSettings(
                        firmCode,
                        request.getGracePeriod(),
                        request.getAttendanceReminders(),
                        request.getPayrollAlerts(),
                        request.getDateFormat(),
                        request.getCurrency(),
                        request.getDarkTheme()
                );

        return ResponseEntity.ok(updatedSettings);
    }
}

