package com.mardabang.hrms.attendance.dto;

public class ShiftDto {

    private String value;
    private String label;
    private int hours;
    private String start;
    private String end;

    public ShiftDto(String value, String label, int hours, String start, String end) {
        this.value = value;
        this.label = label;
        this.hours = hours;
        this.start = start;
        this.end = end;
    }

    public String getValue() {
        return value;
    }

    public String getLabel() {
        return label;
    }

    public int getHours() {
        return hours;
    }

    public String getStart() {
        return start;
    }

    public String getEnd() {
        return end;
    }
}