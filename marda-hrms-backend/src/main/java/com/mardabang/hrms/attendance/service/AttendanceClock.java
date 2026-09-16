package com.mardabang.hrms.attendance.service;
import java.time.*;
import org.springframework.context.annotation.*;
import org.springframework.beans.factory.annotation.Value;
@Configuration("attendanceClockConfiguration")
public class AttendanceClock {
    @Bean public Clock attendanceClock(@Value("${app.attendance.time-zone:Asia/Kolkata}") String zone){return Clock.system(ZoneId.of(zone));}
}
