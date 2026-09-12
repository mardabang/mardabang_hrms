package com.mardabang.hrms.system_settings.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mardabang.hrms.system_settings.entity.SystemSettings;
import com.mardabang.hrms.system_settings.repository.SystemSettingRepository;

@Service
public class SystemSettingService {

    private final SystemSettingRepository systemSettingRepository;

    public SystemSettingService(
            SystemSettingRepository systemSettingRepository) {

        this.systemSettingRepository = systemSettingRepository;
    }

    @Transactional
    public SystemSettings getSystemSettings(String firmCode) {

        validateFirmCode(firmCode);

        return systemSettingRepository
                .findByFirmCode(firmCode)
                .orElseGet(() -> {

                    SystemSettings defaultSettings =
                            SystemSettings.builder()
                                    .firmCode(firmCode)
                                    .gracePeriod(10)
                                    .attendanceReminders(true)
                                    .payrollAlerts(true)
                                    .dateFormat("DD/MM/YYYY")
                                    .currency("INR (₹)")
                                    .darkTheme(false)
                                    .build();

                    return systemSettingRepository.save(defaultSettings);
                });
    }

    @Transactional
    public SystemSettings updateSystemSettings(
            String firmCode,
            Integer gracePeriod,
            Boolean attendanceReminders,
            Boolean payrollAlerts,
            String dateFormat,
            String currency,
            Boolean darkTheme) {

        validateFirmCode(firmCode);

        if (gracePeriod == null
                || gracePeriod < 0
                || gracePeriod > 120) {

            throw new IllegalArgumentException(
                    "Grace period must be between 0 and 120 minutes.");
        }

        if (dateFormat == null || dateFormat.isBlank()) {
            throw new IllegalArgumentException(
                    "Date format is required.");
        }

        if (currency == null || currency.isBlank()) {
            throw new IllegalArgumentException(
                    "Currency is required.");
        }

        SystemSettings settings =
                systemSettingRepository
                        .findByFirmCode(firmCode)
                        .orElseGet(() -> SystemSettings.builder()
                                .firmCode(firmCode)
                                .build());

        settings.setGracePeriod(gracePeriod);

        settings.setAttendanceReminders(
                attendanceReminders != null
                        ? attendanceReminders
                        : true
        );

        settings.setPayrollAlerts(
                payrollAlerts != null
                        ? payrollAlerts
                        : true
        );

        settings.setDateFormat(dateFormat);

        settings.setCurrency(currency);

        settings.setDarkTheme(
                darkTheme != null
                        ? darkTheme
                        : false
        );

        return systemSettingRepository.save(settings);
    }

    private void validateFirmCode(String firmCode) {

        if (firmCode == null || firmCode.isBlank()) {
            throw new IllegalArgumentException(
                    "Firm code is required.");
        }
    }
}