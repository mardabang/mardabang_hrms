package com.mardabang.hrms.backup.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name="backup_history")
public class BackupHistory {

    @Id
    @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    private String fileName;
    private String version;
    private String note;
    private LocalDateTime createdAt;
    @Column(name = "firm_code", nullable = false, length = 20)
    private String firmCode;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId(){ return id; }
    public void setId(Long id){ this.id=id; }

    public String getFileName(){ return fileName; }
    public void setFileName(String fileName){ this.fileName=fileName; }

    public String getVersion(){ return version; }
    public void setVersion(String version){ this.version=version; }

    public String getNote(){ return note; }
    public void setNote(String note){ this.note=note; }

    public LocalDateTime getCreatedAt(){ return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt){ this.createdAt=createdAt; }
    
    public String getFirmCode() {
        return firmCode;
    }

    public void setFirmCode(String firmCode) {
        this.firmCode = firmCode;
    }
}