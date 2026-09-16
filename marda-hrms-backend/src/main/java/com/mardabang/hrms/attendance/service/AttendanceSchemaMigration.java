package com.mardabang.hrms.attendance.service;
import org.springframework.boot.*;
import org.springframework.stereotype.Component;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import lombok.RequiredArgsConstructor;
@Component @Order(-90) @RequiredArgsConstructor
public class AttendanceSchemaMigration implements ApplicationRunner {
    private final JdbcTemplate jdbc;
    @Override public void run(ApplicationArguments args) {
        Integer duplicates=jdbc.queryForObject("SELECT COUNT(*) FROM (SELECT firm_code,employee_code,attendance_date FROM attendance_records WHERE firm_code IS NOT NULL GROUP BY firm_code,employee_code,attendance_date HAVING COUNT(*)>1) duplicates",Integer.class);
        if(duplicates!=null && duplicates>0)throw new IllegalStateException("Duplicate attendance exists for company/employee/date. Resolve these records before starting attendance; no records were deleted.");
        Integer index=jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='attendance_records' AND index_name='uk_attendance_employee_day' AND non_unique=0",Integer.class);
        if(index==null || index==0)jdbc.execute("CREATE UNIQUE INDEX uk_attendance_employee_day ON attendance_records (firm_code,employee_code,attendance_date)");
    }
}
