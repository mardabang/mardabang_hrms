package com.mardabang.hrms.attendance.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mardabang.hrms.attendance.dto.AttendanceCheckoutRequest;
import com.mardabang.hrms.attendance.dto.AttendanceManualRequest;
import com.mardabang.hrms.attendance.dto.AttendancePunchRequest;
import com.mardabang.hrms.attendance.entity.AttendanceRecord;
import com.mardabang.hrms.attendance.service.AttendanceService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/attendance")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class AttendanceController {

    private final AttendanceService attendanceService;


    /*
     * =========================================================
     * EMPLOYEE CHECK-IN
     * =========================================================
     */

    @PostMapping("/checkin")
    public ResponseEntity<?> checkIn(
            @Valid @RequestBody AttendancePunchRequest request) {

        try {

            log.info(
                    "CHECK-IN request: employeeCode={}, employeeName={}, department={}, shift={}, firmCode={}, lat={}, lon={}, recordedBy={}",
                    request.getEmployeeCode(),
                    request.getEmployeeName(),
                    request.getDepartment(),
                    request.getShift(),
                    request.getFirmCode(),
                    request.getLatitude(),
                    request.getLongitude(),
                    request.getRecordedBy()
            );

            AttendanceRecord record =
                    attendanceService.checkIn(request);

            return ResponseEntity.ok(record);

        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(new ErrorResponse(e.getReason()));
        } catch (org.springframework.dao.DataIntegrityViolationException | org.springframework.dao.ConcurrencyFailureException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse("Attendance changed concurrently. Refresh and retry."));
        } catch (IllegalArgumentException e) {

            log.warn(
                    "CHECK-IN validation failed: {}",
                    e.getMessage()
            );

            return ResponseEntity
                    .badRequest()
                    .body(new ErrorResponse(e.getMessage()));

        } catch (IllegalStateException e) {

            log.warn(
                    "CHECK-IN conflict: {}",
                    e.getMessage()
            );

            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse(e.getMessage()));

        } catch (Exception e) {

            log.error(
                    "CHECK-IN failed",
                    e
            );

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            new ErrorResponse(
                                    "Unable to process check-in."
                            )
                    );
        }
    }


    /*
     * =========================================================
     * EMPLOYEE SELF CHECK-OUT
     * =========================================================
     *
     * Employee checkout MUST send:
     *
     * {
     *   "firmCode": "MBIPL",
     *   "recordedBy": "employee@email.com",
     *   "latitude": 16.720236,
     *   "longitude": 74.460701
     * }
     *
     * GPS is validated against the company location.
     */

    @PostMapping("/checkout/{employeeCode}")
    public ResponseEntity<?> checkOut(
            @PathVariable String employeeCode,
            @Valid @RequestBody AttendanceCheckoutRequest request) {

        try {

            log.info(
                    "CHECK-OUT request: employeeCode={}, firmCode={}, lat={}, lon={}, recordedBy={}",
                    employeeCode,
                    request.getFirmCode(),
                    request.getLatitude(),
                    request.getLongitude(),
                    request.getRecordedBy()
            );

            AttendanceRecord record =
                    attendanceService.checkOut(
                            employeeCode,
                            request
                    );

            return ResponseEntity.ok(record);

        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(new ErrorResponse(e.getReason()));
        } catch (org.springframework.dao.DataIntegrityViolationException | org.springframework.dao.ConcurrencyFailureException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse("Attendance changed concurrently. Refresh and retry."));
        } catch (IllegalArgumentException e) {

            log.warn(
                    "CHECK-OUT validation failed: {}",
                    e.getMessage()
            );

            return ResponseEntity
                    .badRequest()
                    .body(new ErrorResponse(e.getMessage()));

        } catch (IllegalStateException e) {

            log.warn(
                    "CHECK-OUT conflict: {}",
                    e.getMessage()
            );

            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse(e.getMessage()));

        } catch (Exception e) {

            log.error(
                    "CHECK-OUT failed",
                    e
            );

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            new ErrorResponse(
                                    "Unable to process check-out."
                            )
                    );
        }
    }


    /*
     * =========================================================
     * TODAY
     * =========================================================
     */

    @GetMapping("/today")
    public ResponseEntity<List<AttendanceRecord>> getToday(
            @RequestParam(required = false) String firmCode) {

        return ResponseEntity.ok(
                attendanceService.getTodayRecords(firmCode)
        );
    }


    /*
     * =========================================================
     * SUMMARY
     * =========================================================
     */

    @GetMapping("/summary")
    public ResponseEntity<?> getSummary(
            @RequestParam(required = false) String firmCode) {

        return ResponseEntity.ok(
                attendanceService.getSummary(firmCode)
        );
    }


    /*
     * =========================================================
     * DEPARTMENT
     * =========================================================
     */

    @GetMapping("/department")
    public ResponseEntity<List<AttendanceRecord>> getByDepartment(
            @RequestParam String department,
            @RequestParam(required = false) String firmCode) {

        return ResponseEntity.ok(
                attendanceService.getByDepartment(
                        department,
                        firmCode
                )
        );
    }


    /*
     * =========================================================
     * DATE
     * =========================================================
     */

    @GetMapping("/date")
    public ResponseEntity<List<AttendanceRecord>> getByDate(
            @RequestParam LocalDate date,
            @RequestParam(required = false) String firmCode) {

        return ResponseEntity.ok(
                attendanceService.getByDate(
                        date,
                        firmCode
                )
        );
    }


    /*
     * =========================================================
     * DATE RANGE
     * =========================================================
     */

    @GetMapping("/range")
    public ResponseEntity<List<AttendanceRecord>> getByDateRange(
            @RequestParam LocalDate from,
            @RequestParam LocalDate to,
            @RequestParam(required = false) String firmCode) {

        return ResponseEntity.ok(
                attendanceService.getByDateRange(
                        from,
                        to,
                        firmCode
                )
        );
    }


    /*
     * =========================================================
     * ADMIN / SUPERVISOR MANUAL ATTENDANCE
     * =========================================================
     *
     * IMPORTANT:
     *
     * Manual checkout does NOT require employee GPS.
     *
     * If an attendance record already exists:
     *     update that record.
     *
     * If checkoutTime is provided but no check-in record exists:
     *     reject the request.
     *
     * This prevents creation of a separate checkout record.
     */

    @PostMapping("/manual")
    public ResponseEntity<?> saveManualAttendance(
            @Valid @RequestBody AttendanceManualRequest request) {

        try {

            AttendanceRecord record =
                    attendanceService.saveManualAttendance(request);

            return ResponseEntity.ok(record);

        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(new ErrorResponse(e.getReason()));
        } catch (org.springframework.dao.DataIntegrityViolationException | org.springframework.dao.ConcurrencyFailureException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse("Attendance changed concurrently. Refresh and retry."));
        } catch (IllegalArgumentException e) {

            log.warn(
                    "MANUAL ATTENDANCE validation failed: {}",
                    e.getMessage()
            );

            return ResponseEntity
                    .badRequest()
                    .body(new ErrorResponse(e.getMessage()));

        } catch (IllegalStateException e) {

            log.warn(
                    "MANUAL ATTENDANCE conflict: {}",
                    e.getMessage()
            );

            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse(e.getMessage()));

        } catch (Exception e) {

            log.error(
                    "MANUAL ATTENDANCE failed",
                    e
            );

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            new ErrorResponse(
                                    "Unable to save manual attendance."
                            )
                    );
        }
    }


    /*
     * =========================================================
     * SHIFTS
     * =========================================================
     */

    @GetMapping("/shifts")
    public ResponseEntity<?> getShifts() {

        return ResponseEntity.ok(
                attendanceService.getShifts()
        );
    }


    /*
     * =========================================================
     * ERROR RESPONSE
     * =========================================================
     */

    @org.springframework.web.bind.annotation.ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<?> accessFailure(org.springframework.web.server.ResponseStatusException e) {return ResponseEntity.status(e.getStatusCode()).body(new ErrorResponse(e.getReason()));}
    record ErrorResponse(String message) {
    }
}