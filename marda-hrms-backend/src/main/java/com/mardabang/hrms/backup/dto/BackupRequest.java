package com.mardabang.hrms.backup.dto;

public class BackupRequest {

    private String firmCode;
    private String note;

    public String getFirmCode() {
        return firmCode;
    }

    public void setFirmCode(String firmCode) {
        this.firmCode = firmCode;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}