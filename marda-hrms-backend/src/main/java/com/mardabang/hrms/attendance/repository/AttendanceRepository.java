package com.mardabang.hrms.attendance.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mardabang.hrms.attendance.entity.AttendanceRecord;

@Repository
public interface AttendanceRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findByCheckInTimeIsNotNullAndCheckOutTimeIsNullAndAttendanceDateLessThanEqual(LocalDate date);
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("update AttendanceRecord a set a.status = :status, a.overtime = 0.0 where a.id = :id and a.checkInTime is not null and a.checkOutTime is null and a.status in :eligible")
    int markMissingCheckout(@org.springframework.data.repository.query.Param("id") Long id, @org.springframework.data.repository.query.Param("status") com.mardabang.hrms.attendance.entity.AttendanceStatus status, @org.springframework.data.repository.query.Param("eligible") java.util.Collection<com.mardabang.hrms.attendance.entity.AttendanceStatus> eligible);

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

    List<AttendanceRecord> findByAttendanceDateAndDepartmentOrderByEmployeeNameAsc(
            LocalDate attendanceDate,
            String department
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
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
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

    List<AttendanceRecord> findByAttendanceDateAndDepartmentAndFirmCodeOrderByEmployeeNameAsc(
            LocalDate attendanceDate,
            String department,
            String firmCode
    );
}