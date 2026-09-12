package com.mardabang.hrms.backup.service;

import com.mardabang.hrms.backup.entity.BackupHistory;
import com.mardabang.hrms.backup.repository.BackupRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class BackupService {

    private final BackupRepository repository;
    
    

    @Value("${spring.datasource.username}")
    private String username;

    @Value("${spring.datasource.password}")
    private String password;

    @Value("${backup.directory}")
    private String backupDirectory;

    @Value("${app.version}")
    private String version;
    
    @Value("${backup.mysqldump.path}")
    private String mysqldumpPath;
    
    @Value("${backup.database}")
    private String database;

    public BackupService(BackupRepository repository) {
        this.repository = repository;
    }

    public String createBackup(String firmCode, String note) throws Exception {

        File folder = new File(backupDirectory);

        if (!folder.exists()) {
            folder.mkdirs();
        }

        String timestamp = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));

        String fileName = firmCode + "_backup_" + timestamp + ".sql";

        File outputFile = new File(folder, fileName);

        ProcessBuilder builder = new ProcessBuilder(
                mysqldumpPath,
                "-u", username,
                "-p" + password,
                database
        );

        builder.redirectOutput(outputFile);

        Process process = builder.start();

        int exitCode = process.waitFor();

        if (exitCode != 0) {
            throw new RuntimeException("Backup failed.");
        }

        BackupHistory history = new BackupHistory();
        history.setFirmCode(firmCode);
        history.setFileName(fileName);
        history.setVersion(version);
        history.setNote(note);

        repository.save(history);

        return "Backup created successfully.";
    }
    public java.util.List<BackupHistory> listBackups() {
        return repository.findAll();
    }
    
    @Value("${backup.temp-directory}")
    private String tempDirectory;

    public String restoreBackup(MultipartFile file, String firmCode) throws Exception {

        File folder = new File(tempDirectory);

        if (!folder.exists()) {
            folder.mkdirs();
        }

        File sqlFile = new File(folder, file.getOriginalFilename());

        file.transferTo(sqlFile);

        ProcessBuilder builder = new ProcessBuilder(
                "C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe",
                "-u", username,
                "-p" + password,
                database
        );

        builder.redirectInput(sqlFile);

        Process process = builder.start();

        int exitCode = process.waitFor();

        sqlFile.delete();

        if (exitCode != 0) {
            throw new RuntimeException("Restore failed for " + firmCode + ".");
        }

        return firmCode + " database restored successfully.";
    }
}