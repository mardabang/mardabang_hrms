package com.mardabang.hrms.backup.repository;

import com.mardabang.hrms.backup.entity.BackupHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BackupRepository extends JpaRepository<BackupHistory, Long> {
}