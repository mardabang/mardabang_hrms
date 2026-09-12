package com.mardabang.hrms.attendance.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mardabang.hrms.attendance.entity.AttendanceRecord;

@Repository
public interface AttendanceRepository extends JpaRepository<AttendanceRecord, Long> {

    /*
     * ---------------------------------------------------------
     * BASIC ATTENDANCE QUERIES
     * ---------------------------------------------------------
     */

    List<AttendanceRecord> findByAttendanceDateOrderByCheckInTimeAsc(
            LocalDate attendanceDate
    );

    List<AttendanceRecord> findByAttendanceDateBetweenOrderByAttendanceDateAscCheckInTimeAsc(
            LocalDate from,
            LocalDate to
    );

    List<AttendanceRecord> findByAttendanceDateAndDepartmentAndTeamOrderByEmployeeNameAsc(
            LocalDate attendanceDate,
            String department,
            String team
    );

    Optional<AttendanceRecord> findByEmployeeCodeAndAttendanceDate(
            String employeeCode,
            LocalDate attendanceDate
    );

    List<AttendanceRecord> findByEmployeeCodeAndAttendanceDateBetweenOrderByAttendanceDateAsc(
            String employeeCode,
            LocalDate from,
            LocalDate to
    );

    List<AttendanceRecord> findByEmployeeCode(
            String employeeCode
    );


    /*
     * ---------------------------------------------------------
     * FIRM-SPECIFIC QUERIES
     * ---------------------------------------------------------
     */

    List<AttendanceRecord> findByAttendanceDateAndFirmCodeOrderByCheckInTimeAsc(
            LocalDate attendanceDate,
            String firmCode
    );

    List<AttendanceRecord> findByAttendanceDateAndFirmCodeOrderByEmployeeNameAsc(
            LocalDate attendanceDate,
            String firmCode
    );

    List<AttendanceRecord> findByAttendanceDateBetweenAndFirmCodeOrderByAttendanceDateAscCheckInTimeAsc(
            LocalDate from,
            LocalDate to,
            String firmCode
    );

    /*
     * IMPORTANT:
     * This is now the preferred lookup for checkout/manual update.
     * It prevents updating an employee's attendance record
     * belonging to another firm.
     */
    Optional<AttendanceRecord> findByEmployeeCodeAndAttendanceDateAndFirmCode(
            String employeeCode,
            LocalDate attendanceDate,
            String firmCode
    );

    List<AttendanceRecord> findByEmployeeCodeAndAttendanceDateBetweenAndFirmCodeOrderByAttendanceDateAsc(
            String employeeCode,
            LocalDate from,
            LocalDate to,
            String firmCode
    );

    List<AttendanceRecord> findByAttendanceDateAndDepartmentAndTeamAndFirmCodeOrderByEmployeeNameAsc(
            LocalDate attendanceDate,
            String department,
            String team,
            String firmCode
    );
}