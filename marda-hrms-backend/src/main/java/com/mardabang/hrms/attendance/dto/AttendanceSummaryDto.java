package com.mardabang.hrms.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AttendanceSummaryDto {

    private long present;
    private long late;
    private long pending;
    private long completed;
}
