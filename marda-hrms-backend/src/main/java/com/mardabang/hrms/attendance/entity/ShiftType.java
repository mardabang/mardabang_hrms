package com.mardabang.hrms.attendance.entity;

public enum ShiftType {

    GENERAL("General", 9, "09:00", "18:00"),
    EIGHT_HOURS("8 Hours", 8, "09:00", "17:00"),
    TWELVE_HOURS("12 Hours", 12, "09:00", "21:00");

    private final String label;
    private final int hours;
    private final String startTime;
    private final String endTime;

    ShiftType(String label, int hours, String startTime, String endTime) {
        this.label = label;
        this.hours = hours;
        this.startTime = startTime;
        this.endTime = endTime;
    }

    public String getLabel() {
        return label;
    }

    public int getHours() {
        return hours;
    }

    public String getStartTime() {
        return startTime;
    }

    public String getEndTime() {
        return endTime;
    }
}