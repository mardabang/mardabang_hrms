package com.mardabang.hrms.attendance.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mardabang.hrms.attendance.dto.AttendanceCheckoutRequest;
import com.mardabang.hrms.attendance.dto.AttendanceManualRequest;
import com.mardabang.hrms.attendance.dto.AttendancePunchRequest;
import com.mardabang.hrms.attendance.dto.ShiftDto;
import com.mardabang.hrms.attendance.entity.AttendanceRecord;
import com.mardabang.hrms.attendance.entity.AttendanceStatus;
import com.mardabang.hrms.attendance.entity.ShiftType;
import com.mardabang.hrms.attendance.repository.AttendanceRepository;
import java.util.stream.Collectors;
import com.mardabang.hrms.attendance.service.AttendanceLocationPolicy;

import org.springframework.scheduling.annotation.Scheduled;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class AttendanceService {

    /*
     * =========================================================
     * COMPANY LOCATION
     * =========================================================
     */

    private final AttendanceLocationPolicy locationPolicy;

    /*
     * =========================================================
     * ATTENDANCE RULES
     * =========================================================
     */

    private static final int GRACE_PERIOD_MINUTES = 10;

    /*
     * OT is allowed ONLY for 8-hour shifts.
     */
    private static final int EIGHT_HOUR_SHIFT_MINUTES = 8 * 60;


    private final AttendanceRepository attendanceRepository;
    private final AttendanceAccess access;
    private final java.time.Clock attendanceClock;


    /*
     * =========================================================
     * CHECK-IN
     * =========================================================
     */

    public AttendanceRecord checkIn(
            AttendancePunchRequest request) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Check-in request is required."
            );
        }

        access.checkIn(request);

        LocalDate today = LocalDate.now(attendanceClock);

        LocalTime now = LocalTime.now(attendanceClock).withNano(0);

        /*
         * Employee check-in always requires valid GPS.
         */
        validateLocation(
                request.getLatitude(),
                request.getLongitude(),
                request.getAccuracy(),
                request.getFirmCode(),
                "check-in"
        );

        /*
         * Firm-specific duplicate check.
         */
        AttendanceRecord existing =
                attendanceRepository
                        .findByEmployeeCodeAndAttendanceDateAndFirmCode(
                                request.getEmployeeCode(),
                                today,
                                request.getFirmCode()
                        )
                        .orElse(null);

        /*
         * Employee cannot check in twice.
         */
        if (existing != null) {

            if (existing.getCheckInTime() != null) {

                throw new IllegalStateException(
                        "Employee has already checked in today."
                );
            }
        }

        AttendanceRecord record;

        if (existing != null) {

            record = existing;

        } else {

            record = new AttendanceRecord();
        }


        /*
         * -----------------------------------------------------
         * Employee details
         * -----------------------------------------------------
         */

        record.setFirmCode(
                request.getFirmCode()
        );

        record.setEmployeeCode(
                request.getEmployeeCode()
        );

        record.setEmployeeName(
                request.getEmployeeName()
        );

        record.setDepartment(
                request.getDepartment()
        );

        /*
         * Shift comes from the employee/attendance request.
         *
         * Later the Supervisor UI should take the current shift
         * directly from Employee Master.
         */
        record.setShift(
                request.getShift()
        );

        record.setAttendanceDate(
                today
        );


        /*
         * -----------------------------------------------------
         * Check-in details
         * -----------------------------------------------------
         */

        record.setCheckInTime(
                now
        );

        record.setRecordedBy(
                request.getRecordedBy()
        );

        record.setCheckInAccuracy(request.getAccuracy());

        record.setCheckInLatitude(
                request.getLatitude()
        );

        record.setCheckInLongitude(
                request.getLongitude()
        );


        /*
         * New check-in always starts with zero OT.
         */
        record.setOvertime(0.0);


        /*
         * Determine PRESENT/LATE using employee shift.
         */
        record.setStatus(
                determineStatus(
                        request.getShift(),
                        now
                )
        );


        AttendanceRecord saved =
                attendanceRepository.save(record);

        log.info(
                "CHECK-IN successful: employeeCode={}, firmCode={}, time={}, status={}",
                saved.getEmployeeCode(),
                saved.getFirmCode(),
                saved.getCheckInTime(),
                saved.getStatus()
        );

        return saved;
    }


    /*
     * =========================================================
     * EMPLOYEE SELF CHECK-OUT
     * =========================================================
     *
     * GPS REQUIRED.
     *
     * This method updates the existing attendance record.
     * It NEVER creates a new record.
     */

    public AttendanceRecord checkOut(
            String employeeCode,
            AttendanceCheckoutRequest request) {

        if (employeeCode == null ||
                employeeCode.trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Employee code is required."
            );
        }

        if (request == null) {

            throw new IllegalArgumentException(
                    "Checkout request is required."
            );
        }

        access.checkOut(employeeCode, request);

        LocalDate today = LocalDate.now(attendanceClock);

        LocalTime checkoutTime =
                LocalTime.now(attendanceClock).withNano(0);


        /*
         * -----------------------------------------------------
         * GPS VALIDATION
         * -----------------------------------------------------
         *
         * Employee self-checkout must be inside company radius.
         */

        validateLocation(
                request.getLatitude(),
                request.getLongitude(),
                request.getAccuracy(),
                request.getFirmCode(),
                "check-out"
        );


        /*
         * -----------------------------------------------------
         * FIND EXISTING RECORD
         * -----------------------------------------------------
         *
         * Firm code is included to prevent cross-firm updates.
         */

        AttendanceRecord record =
                attendanceRepository
                        .findByEmployeeCodeAndAttendanceDateAndFirmCode(
                                employeeCode,
                                today,
                                request.getFirmCode()
                        )
                        .orElseThrow(
                                () -> new IllegalArgumentException(
                                        "No check-in record found for employee today."
                                )
                        );


        /*
         * Employee must have checked in first.
         */

        if (record.getCheckInTime() == null) {

            throw new IllegalStateException(
                    "Employee has not checked in today."
            );
        }


        /*
         * Prevent duplicate checkout.
         */

        if (record.getCheckOutTime() != null) {

            throw new IllegalStateException(
                    "Employee has already checked out today."
            );
        }


        /*
         * -----------------------------------------------------
         * SAVE CHECKOUT
         * -----------------------------------------------------
         */

        record.setCheckOutTime(
                checkoutTime
        );

        /*
         * The person performing the latest action is stored.
         */
        record.setRecordedBy(
                request.getRecordedBy()
        );


        /*
         * -----------------------------------------------------
         * CHECKOUT GPS
         * -----------------------------------------------------
         *
         * This requires the AttendanceRecord entity to contain:
         *
         * private Double checkOutLatitude;
         * private Double checkOutLongitude;
         *
         * If those fields are not yet present, add them.
         */

        try {

            record.setCheckOutAccuracy(request.getAccuracy());

            record.setCheckOutLatitude(
                    request.getLatitude()
            );

            record.setCheckOutLongitude(
                    request.getLongitude()
            );

        } catch (NoSuchMethodError ignored) {

            /*
             * This block is only defensive.
             *
             * Normally the entity should contain the two fields.
             */
        }


        /*
         * -----------------------------------------------------
         * OVERTIME
         * -----------------------------------------------------
         *
         * Only 8-hour shifts can receive OT.
         */

        double overtime =
                calculateOvertime(
                        record.getCheckInTime(),
                        checkoutTime,
                        record.getShift()
                );

        record.setOvertime(
                overtime
        );


        /*
         * Completed after successful checkout.
         */

        record.setStatus(
                AttendanceStatus.COMPLETED
        );


        AttendanceRecord saved =
                attendanceRepository.save(record);

        log.info(
                "CHECK-OUT successful: employeeCode={}, firmCode={}, checkIn={}, checkOut={}, shift={}, overtime={}",
                saved.getEmployeeCode(),
                saved.getFirmCode(),
                saved.getCheckInTime(),
                saved.getCheckOutTime(),
                saved.getShift(),
                saved.getOvertime()
        );

        return saved;
    }


    /*
     * =========================================================
     * ADMIN / SUPERVISOR MANUAL ATTENDANCE
     * =========================================================
     *
     * GPS IS NOT REQUIRED.
     *
     * Manual checkout updates an existing check-in record.
     */

    public AttendanceRecord saveManualAttendance(
            AttendanceManualRequest request) {

        if (request == null) {

            throw new IllegalArgumentException(
                    "Attendance request is required."
            );
        }

        if (request.getEmployeeCode() == null ||
                request.getEmployeeCode().trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Employee code is required."
            );
        }

        if (request.getFirmCode() == null ||
                request.getFirmCode().trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Firm code is required."
            );
        }


        access.manual(request);

        LocalDate attendanceDate =
                request.getAttendanceDate() != null
                        ? request.getAttendanceDate()
                        : LocalDate.now(attendanceClock);


        /*
         * Find the existing record using:
         *
         * employeeCode + attendanceDate + firmCode
         */

        AttendanceRecord existing =
                attendanceRepository
                        .findByEmployeeCodeAndAttendanceDateAndFirmCode(
                                request.getEmployeeCode(),
                                attendanceDate,
                                request.getFirmCode()
                        )
                        .orElse(null);


        if(existing!=null) {
            request.setEmployeeName(existing.getEmployeeName());
            request.setDepartment(existing.getDepartment());
            request.setShift(existing.getShift());
        }
        boolean isManualCheckout =
                request.getCheckOutTime() != null;


        /*
         * -----------------------------------------------------
         * MANUAL CHECKOUT
         * -----------------------------------------------------
         *
         * If admin/supervisor is trying to checkout someone
         * and there is no existing check-in record, DO NOT
         * create a new record.
         */

        if (isManualCheckout && existing == null) {

            /*
             * Exception:
             *
             * If BOTH check-in and check-out are supplied,
             * treat it as a complete manual attendance entry.
             *
             * This preserves the existing Admin Attendance
             * functionality.
             */

            if (request.getCheckInTime() == null) {

                throw new IllegalStateException(
                        "Cannot checkout employee because no existing check-in record was found."
                );
            }
        }


        AttendanceRecord record;


        /*
         * Existing record = update it.
         */
        if (existing != null) {

            record = existing;

        } else {

            /*
             * No existing record.
             *
             * This is allowed only for a normal manual attendance
             * entry, not checkout-only.
             */

            record = new AttendanceRecord();
        }


        /*
         * -----------------------------------------------------
         * BASIC EMPLOYEE INFORMATION
         * -----------------------------------------------------
         */

        record.setFirmCode(
                request.getFirmCode()
        );

        record.setEmployeeCode(
                request.getEmployeeCode()
        );

        record.setEmployeeName(
                request.getEmployeeName()
        );

        record.setDepartment(
                request.getDepartment()
        );

        record.setShift(
                request.getShift()
        );

        record.setAttendanceDate(
                attendanceDate
        );


        /*
         * -----------------------------------------------------
         * CHECK-IN
         * -----------------------------------------------------
         */

        if (request.getCheckInTime() != null) {

            record.setCheckInTime(
                    request.getCheckInTime()
            );
        }


        /*
         * -----------------------------------------------------
         * CHECKOUT
         * -----------------------------------------------------
         */

        if (request.getCheckOutTime() != null) {

            /*
             * If updating an existing record, make sure it has
             * an original check-in.
             */

            if (record.getCheckInTime() == null) {

                throw new IllegalStateException(
                        "Cannot checkout employee because no check-in time exists."
                );
            }

            record.setCheckOutTime(
                    request.getCheckOutTime()
            );

            /*
             * Manual checkout is performed by Admin/Supervisor,
             * therefore their identity is saved.
             */
            record.setRecordedBy(
                    request.getRecordedBy()
            );


            /*
             * Calculate OT from actual check-in → checkout.
             *
             * Only 8-hour shifts can receive OT.
             */

            double overtime =
                    calculateOvertime(
                            record.getCheckInTime(),
                            record.getCheckOutTime(),
                            record.getShift()
                    );

            record.setOvertime(
                    overtime
            );


            /*
             * Manual checkout means attendance is completed.
             */

            record.setStatus(
                    AttendanceStatus.COMPLETED
            );

        } else {

            /*
             * -------------------------------------------------
             * NORMAL MANUAL ATTENDANCE
             * -------------------------------------------------
             */

            record.setRecordedBy(
                    request.getRecordedBy()
            );

            record.setNotes(
                    request.getNotes()
            );


            /*
             * Explicit status from Admin has priority.
             */

            if (request.getStatus() != null &&
                    !request.getStatus().trim().isEmpty()) {

                try {

                    record.setStatus(
                            AttendanceStatus.valueOf(
                                    request
                                            .getStatus()
                                            .trim()
                                            .toUpperCase(Locale.ROOT)
                            )
                    );

                } catch (IllegalArgumentException ex) {

                    throw new IllegalArgumentException(
                            "Invalid attendance status: "
                                    + request.getStatus()
                    );
                }

            } else if (record.getCheckOutTime() != null) {

                record.setStatus(
                        AttendanceStatus.COMPLETED
                );

            } else if (record.getCheckInTime() != null) {

                record.setStatus(
                        determineStatus(
                                record.getShift(),
                                record.getCheckInTime()
                        )
                );

            } else {

                record.setStatus(
                        AttendanceStatus.PENDING
                );
            }


            /*
             * For manual attendance, calculate OT only when
             * both check-in and check-out exist.
             */

            if (record.getCheckInTime() != null &&
                    record.getCheckOutTime() != null) {

                record.setOvertime(
                        calculateOvertime(
                                record.getCheckInTime(),
                                record.getCheckOutTime(),
                                record.getShift()
                        )
                );

            } else if (request.getOvertime() != null) {

                /*
                 * Manual OT is allowed only for 8-hour shifts.
                 */

                if (isEightHourShift(record.getShift())) {

                    record.setOvertime(
                            Math.max(
                                    0.0,
                                    request.getOvertime()
                            )
                    );

                } else {

                    record.setOvertime(0.0);
                }

            } else {

                record.setOvertime(0.0);
            }
        }


        /*
         * -----------------------------------------------------
         * NOTES
         * -----------------------------------------------------
         */

        if (request.getNotes() != null) {

            record.setNotes(
                    request.getNotes()
            );
        }


        /*
         * -----------------------------------------------------
         * OPTIONAL MANUAL GPS
         * -----------------------------------------------------
         *
         * Admin/Supervisor GPS is NOT validated.
         *
         * If supplied, the existing check-in GPS fields are
         * not overwritten here because they represent the
         * original employee punch.
         */


        AttendanceRecord saved =
                attendanceRepository.save(record);

        log.info(
                "MANUAL ATTENDANCE saved: employeeCode={}, firmCode={}, date={}, checkIn={}, checkOut={}, status={}, overtime={}, recordedBy={}",
                saved.getEmployeeCode(),
                saved.getFirmCode(),
                saved.getAttendanceDate(),
                saved.getCheckInTime(),
                saved.getCheckOutTime(),
                saved.getStatus(),
                saved.getOvertime(),
                saved.getRecordedBy()
        );

        return saved;
    }


    /*
     * =========================================================
     * TODAY RECORDS
     * =========================================================
     */

    @Transactional(readOnly = true)
    public List<AttendanceRecord> getTodayRecords(
            String firmCode) {
        access.readCompany(firmCode);

        LocalDate today = LocalDate.now(attendanceClock);

        if (firmCode == null ||
                firmCode.trim().isEmpty()) {

            return attendanceRepository
                    .findByAttendanceDateOrderByCheckInTimeAsc(
                            today
                    );
        }

        return attendanceRepository
                .findByAttendanceDateAndFirmCodeOrderByCheckInTimeAsc(
                        today,
                        firmCode
                );
    }


    /*
     * =========================================================
     * SUMMARY
     * =========================================================
     */

    @Transactional(readOnly = true)
    public AttendanceSummary getSummary(
            String firmCode) {

        List<AttendanceRecord> records =
                getTodayRecords(firmCode);


        long present =
                records.stream()
                        .filter(record ->
                                record.getStatus() ==
                                        AttendanceStatus.PRESENT
                                        ||
                                record.getStatus() ==
                                        AttendanceStatus.LATE
                                        ||
                                record.getStatus() ==
                                        AttendanceStatus.COMPLETED
                        )
                        .count();


        long late =
                records.stream()
                        .filter(record ->
                                record.getStatus() ==
                                        AttendanceStatus.LATE
                        )
                        .count();


        long pending =
                records.stream()
                        .filter(record ->
                                record.getStatus() ==
                                        AttendanceStatus.PENDING
                        )
                        .count();


        long completed =
                records.stream()
                        .filter(record ->
                                record.getStatus() ==
                                        AttendanceStatus.COMPLETED
                        )
                        .count();


        long absent =
                records.stream()
                        .filter(record ->
                                record.getStatus() ==
                                        AttendanceStatus.ABSENT
                        )
                        .count();


        return new AttendanceSummary(
                present,
                late,
                pending,
                completed,
                absent
        );
    }


    /*
     * =========================================================
     * DEPARTMENT
     * =========================================================
     */

    @Transactional(readOnly = true)
    public List<AttendanceRecord> getByDepartment(
            String department,
            String firmCode) {
        access.readCompany(firmCode);

        LocalDate today = LocalDate.now(attendanceClock);

        if (firmCode == null ||
                firmCode.trim().isEmpty()) {

            return attendanceRepository
                    .findByAttendanceDateAndDepartmentOrderByEmployeeNameAsc(
                            today,
                            department
                    );
        }

        return attendanceRepository
                .findByAttendanceDateAndDepartmentAndFirmCodeOrderByEmployeeNameAsc(
                        today,
                        department,
                        firmCode
                );
    }


    /*
     * =========================================================
     * DATE
     * =========================================================
     */

    @Transactional(readOnly = true)
    public List<AttendanceRecord> getByDate(
            LocalDate date,
            String firmCode) {
        access.readCompany(firmCode);

        if (date == null) {

            throw new IllegalArgumentException(
                    "Attendance date is required."
            );
        }

        if (firmCode == null ||
                firmCode.trim().isEmpty()) {

            return attendanceRepository
                    .findByAttendanceDateOrderByCheckInTimeAsc(
                            date
                    );
        }

        return attendanceRepository
                .findByAttendanceDateAndFirmCodeOrderByEmployeeNameAsc(
                        date,
                        firmCode
                );
    }


    /*
     * =========================================================
     * DATE RANGE
     * =========================================================
     */

    @Transactional(readOnly = true)
    public List<AttendanceRecord> getByDateRange(
            LocalDate from,
            LocalDate to,
            String firmCode) {
        access.readCompany(firmCode);

        if (from == null || to == null) {

            throw new IllegalArgumentException(
                    "Both from and to dates are required."
            );
        }

        if (from.isAfter(to)) {

            throw new IllegalArgumentException(
                    "The from date must not be after the to date."
            );
        }

        if (firmCode == null ||
                firmCode.trim().isEmpty()) {

            return attendanceRepository
                    .findByAttendanceDateBetweenOrderByAttendanceDateAscCheckInTimeAsc(
                            from,
                            to
                    );
        }

        return attendanceRepository
                .findByAttendanceDateBetweenAndFirmCodeOrderByAttendanceDateAscCheckInTimeAsc(
                        from,
                        to,
                        firmCode
                );
    }


    /*
     * =========================================================
     * SHIFTS
     * =========================================================
     *
     * These are shift DEFINITIONS only.
     *
     * Employee assignment should come from Employee Master.
     */

    @Transactional(readOnly = true)
    public List<ShiftDto> getShifts() {

        return List.of(ShiftType.values())
                .stream()
                .map(
                        shift -> new ShiftDto(
                                shift.name(),
                                shift.getLabel(),
                                shift.getHours(),
                                shift.getStartTime(),
                                shift.getEndTime()
                        )
                )
                .toList();
    }


    /*
     * =========================================================
     * DETERMINE PRESENT / LATE
     * =========================================================
     *
     * Uses the shift start time.
     *
     * Example:
     *
     * Morning 07:00
     * Grace until 07:10
     * 07:10+ => Late
     */

    private AttendanceStatus determineStatus(
            String shift,
            LocalTime checkInTime) {

        if (checkInTime == null) {

            return AttendanceStatus.PENDING;
        }

        LocalTime shiftStart =
                getShiftStartTime(shift);


        LocalTime lateThreshold =
                shiftStart.plusMinutes(
                        GRACE_PERIOD_MINUTES
                );


        if (checkInTime.isAfter(lateThreshold)) {

            return AttendanceStatus.LATE;
        }

        return AttendanceStatus.PRESENT;
    }


    /*
     * =========================================================
     * OVERTIME
     * =========================================================
     *
     * IMPORTANT:
     *
     * OT is ONLY available for 8-hour shifts.
     *
     * Actual working duration:
     *
     * checkout - checkin
     *
     * 10-minute grace is excluded from OT.
     *
     * Example:
     *
     * Check-in 08:00
     * Check-out 16:05
     * Worked 8h 05m
     * No OT because of 10-minute grace.
     *
     * Check-in 08:00
     * Check-out 16:30
     * Worked 8h 30m
     * OT = 20 minutes = 0.33 hours
     */

    private double calculateOvertime(
            LocalTime checkIn,
            LocalTime checkOut,
            String shift) {

        /*
         * No OT for non-8-hour shifts.
         */

        if (!isEightHourShift(shift)) {

            return 0.0;
        }

        if (checkIn == null ||
                checkOut == null) {

            return 0.0;
        }


        long workedMinutes =
                calculateWorkedMinutes(
                        checkIn,
                        checkOut
                );


        if (workedMinutes <= 0) {

            return 0.0;
        }


        /*
         * Remove the standard 8-hour working period.
         */

        long overtimeMinutes =
                workedMinutes
                        - EIGHT_HOUR_SHIFT_MINUTES;


        /*
         * Apply 10-minute OT grace.
         */

        overtimeMinutes -=
                GRACE_PERIOD_MINUTES;


        if (overtimeMinutes <= 0) {

            return 0.0;
        }


        double overtimeHours =
                overtimeMinutes / 60.0;


        /*
         * Store maximum 2 decimal places.
         */

        return BigDecimal
                .valueOf(overtimeHours)
                .setScale(
                        2,
                        RoundingMode.HALF_UP
                )
                .doubleValue();
    }


    /*
     * =========================================================
     * WORKING MINUTES
     * =========================================================
     *
     * Handles overnight shifts too.
     */

    private long calculateWorkedMinutes(
            LocalTime checkIn,
            LocalTime checkOut) {

        if (checkIn == null ||
                checkOut == null) {

            return 0;
        }

        long minutes =
                Duration
                        .between(
                                checkIn,
                                checkOut
                        )
                        .toMinutes();


        /*
         * Overnight attendance.
         *
         * Example:
         * 22:00 -> 06:00
         */

        if (minutes < 0) {

            minutes += 24 * 60;
        }

        return minutes;
    }


    /*
     * =========================================================
     * 8-HOUR SHIFT CHECK
     * =========================================================
     */

    private boolean isEightHourShift(
            String shift) {
        var configured = configuredShift(shift);
        if(configured!=null)return configured.getHours()==8;

        if (shift == null ||
                shift.trim().isEmpty()) {

            return false;
        }

        String normalized =
                shift
                        .trim()
                        .toLowerCase(Locale.ROOT);


        /*
         * Supports:
         *
         * "8 Hours"
         * "8 Hours Shift"
         * "EIGHT_HOURS"
         * "EIGHT HOURS"
         * "8"
         */

        return normalized.contains("8")
                || normalized.contains("eight");
    }


    /*
     * =========================================================
     * SHIFT START TIME
     * =========================================================
     *
     * The employee's assigned shift name is used.
     */

    private LocalTime getShiftStartTime(
            String shift) {
        var configured = configuredShift(shift);
        if(configured!=null)return LocalTime.parse(configured.getStartTime());

        if (shift == null ||
                shift.trim().isEmpty()) {

            /*
             * Backward-compatible default.
             */
            return LocalTime.of(9, 0);
        }


        String normalized =
                shift
                        .trim()
                        .toLowerCase(Locale.ROOT);


        if (normalized.contains("morning")) {

            return LocalTime.of(7, 0);
        }


        if (normalized.contains("evening")) {

            return LocalTime.of(14, 0);
        }


        if (normalized.contains("12")) {

            return LocalTime.of(8, 0);
        }


        if (normalized.contains("8")
                || normalized.contains("eight")) {

            return LocalTime.of(8, 0);
        }


        /*
         * General shift.
         */
        return LocalTime.of(9, 0);
    }
    
    
    
    /**
     * =========================================================
     * SHIFT END TIME
     * =========================================================
     */
    private ShiftType configuredShift(String shift) {
        if(shift==null || shift.isBlank())return ShiftType.GENERAL;
        for(ShiftType type:ShiftType.values())if(type.name().equalsIgnoreCase(shift.trim()) || type.getLabel().equalsIgnoreCase(shift.trim()))return type;
        return null;
    }
    private LocalTime getShiftEndTime(String shift) {
        var configured = configuredShift(shift);
        if(configured!=null)return LocalTime.parse(configured.getEndTime());

        if (shift == null || shift.trim().isEmpty()) {
            // General shift
            return LocalTime.of(18, 0);
        }

        String normalized =
                shift.trim().toLowerCase(Locale.ROOT);

        if (normalized.contains("morning")) {
            return LocalTime.of(16, 0);
        }

        if (normalized.contains("evening")) {
            return LocalTime.of(23, 0);
        }

        if (normalized.contains("12")) {
            return LocalTime.of(20, 0);
        }

        if (normalized.contains("8")
                || normalized.contains("eight")) {
            return LocalTime.of(16, 0);
        }

        // General
        return LocalTime.of(18, 0);
    }


    /*
     * =========================================================
     * LOCATION VALIDATION
     * =========================================================
     *
     * Haversine distance calculation.
     */

    private void validateLocation(Double latitude, Double longitude,
            Double accuracy, String firmCode, String action) {
        locationPolicy.validate(latitude, longitude, accuracy, firmCode, action);
    }

    @Transactional(readOnly = true)
    public AttendanceRecord getTodayRecordForEmployee(
            String employeeCode) {

        return attendanceRepository
                .findByEmployeeCodeAndAttendanceDate(
                        employeeCode,
                        LocalDate.now(attendanceClock)
                )
                .orElse(null);
    }


    /*
     * =========================================================
     * EMPLOYEE ATTENDANCE RANGE
     * =========================================================
     */

    @Transactional(readOnly = true)
    public List<AttendanceRecord> getMyAttendanceRange(
            String employeeCode,
            LocalDate from,
            LocalDate to) {

        if (from == null ||
                to == null) {

            throw new IllegalArgumentException(
                    "Both from and to dates are required."
            );
        }

        if (from.isAfter(to)) {

            throw new IllegalArgumentException(
                    "The from date must not be after the to date."
            );
        }

        return attendanceRepository
                .findByEmployeeCodeAndAttendanceDateBetweenOrderByAttendanceDateAsc(
                        employeeCode,
                        from,
                        to
                );
    }


    /*
     * =========================================================
     * SUMMARY DTO
     * =========================================================
     */

    public record AttendanceSummary(
            long present,
            long late,
            long pending,
            long completed,
            long absent
    ) {
    }
    
    
    
    /**
     * =========================================================
     * MARK MISSING CHECKOUTS
     * =========================================================
     *
     * Runs every minute.
     *
     * If an employee has:
     * - checked in
     * - not checked out
     * - shift end time has passed
     *
     * then attendance becomes MISSING_CHECKOUT.
     *
     * IMPORTANT:
     * We do NOT create a checkout time here.
     * We also do NOT calculate OT here.
     *
     * Supervisor must enter the actual checkout time.
     */
    @Scheduled(fixedRate = 60_000)
    public void markMissingCheckouts() {

        LocalDate today = LocalDate.now(attendanceClock);


        List<AttendanceRecord> records =
                attendanceRepository
                        .findByCheckInTimeIsNotNullAndCheckOutTimeIsNullAndAttendanceDateLessThanEqual(today);

        for (AttendanceRecord record : records) {

            // No check-in = nothing to process
            if (record.getCheckInTime() == null) {
                continue;
            }

            // Already checked out
            if (record.getCheckOutTime() != null) {
                continue;
            }

            // Do not change leave/off/holiday/absent records
            if (record.getStatus() == AttendanceStatus.ABSENT
                    || record.getStatus() == AttendanceStatus.PAID_LEAVE
                    || record.getStatus() == AttendanceStatus.WEEKLY_OFF
                    || record.getStatus() == AttendanceStatus.HOLIDAY) {
                continue;
            }

            LocalTime shiftEnd =
                    getShiftEndTime(record.getShift());

            if (shiftEnd == null) {
                continue;
            }

            /*
             * Only mark after shift end.
             */
            java.time.LocalDateTime due=record.getAttendanceDate().atTime(shiftEnd);
            if(!shiftEnd.isAfter(getShiftStartTime(record.getShift())))due=due.plusDays(1);
            if (java.time.LocalDateTime.now(attendanceClock).isAfter(due)) {

                int changed=attendanceRepository.markMissingCheckout(record.getId(),AttendanceStatus.MISSING_CHECKOUT,
                    java.util.List.of(AttendanceStatus.PRESENT,AttendanceStatus.LATE,AttendanceStatus.PENDING));
                if(changed==0)continue;

                log.info(
                        "MISSING CHECKOUT: employeeCode={}, firmCode={}, shift={}, shiftEnd={}",
                        record.getEmployeeCode(),
                        record.getFirmCode(),
                        record.getShift(),
                        shiftEnd
                );
            }
        }
    }
}