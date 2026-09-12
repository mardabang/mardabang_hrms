package com.mardabang.hrms.system_settings.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mardabang.hrms.system_settings.entity.SystemSettings;

public interface SystemSettingRepository
        extends JpaRepository<SystemSettings, Long> {

    Optional<SystemSettings> findByFirmCode(String firmCode);
}