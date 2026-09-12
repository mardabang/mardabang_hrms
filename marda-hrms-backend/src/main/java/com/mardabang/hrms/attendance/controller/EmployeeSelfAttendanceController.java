package com.mardabang.hrms.attendance.controller;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.mardabang.hrms.attendance.dto.AttendanceCheckoutRequest;
import com.mardabang.hrms.attendance.dto.AttendancePunchRequest;
import com.mardabang.hrms.attendance.dto.SelfCheckInRequest;
import com.mardabang.hrms.attendance.entity.AttendanceRecord;
import com.mardabang.hrms.attendance.service.AttendanceService;
import com.mardabang.hrms.employee.dto.EmployeeDto;
import com.mardabang.hrms.employee.service.EmployeeService;
import com.mardabang.hrms.firms.entity.Firm;
import com.mardabang.hrms.firms.repository.FirmRepository;
import com.mardabang.hrms.user.entity.User;
import com.mardabang.hrms.user.service.UserService;

@RestController
@RequestMapping("/api/me/attendance")
public class EmployeeSelfAttendanceController {

    private final AttendanceService attendanceService;
    private final EmployeeService employeeService;
    private final UserService userService;
    private final FirmRepository firmRepository;

    public EmployeeSelfAttendanceController(
            AttendanceService attendanceService,
            EmployeeService employeeService,
            UserService userService,
            FirmRepository firmRepository) {

        this.attendanceService = attendanceService;
        this.employeeService = employeeService;
        this.userService = userService;
        this.firmRepository = firmRepository;
    }

    /*
     * =========================================================
     * GET TODAY ATTENDANCE
     * =========================================================
     */

    @GetMapping("/today")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<?> getToday(
            Authentication authentication) {

        try {

            String employeeCode =
                    resolveEmployeeCode(authentication);

            return ResponseEntity.ok(
                    attendanceService
                            .getTodayRecordForEmployee(employeeCode)
                            
            );

        } catch (IllegalStateException ex) {

            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            ex.getMessage()
                    ));
        }
    }


    /*
     * =========================================================
     * EMPLOYEE SELF CHECK-IN
     * =========================================================
     *
     * Employee details and shift are taken from Employee Master.
     *
     * GPS is mandatory.
     */

    @PostMapping("/checkin")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<?> checkIn(
            Authentication authentication,
            @RequestBody SelfCheckInRequest req) {

        try {

            String employeeCode =
                    resolveEmployeeCode(authentication);


            EmployeeDto employee =
                    employeeService.getEmployeeByCode(employeeCode);


            if (employee == null) {

                return ResponseEntity
                        .badRequest()
                        .body(Map.of(
                                "message",
                                "Employee record not found."
                        ));
            }


            /*
             * -------------------------------------------------
             * GET EMPLOYEE FIRM
             * -------------------------------------------------
             */

            String firmCode = null;

            if (employee.getFirmId() != null) {

                firmCode =
                        firmRepository
                                .findById(employee.getFirmId())
                                .map(Firm::getCode)
                                .orElse(null);
            }


            if (firmCode == null ||
                    firmCode.isBlank()) {

                return ResponseEntity
                        .badRequest()
                        .body(Map.of(
                                "message",
                                "Employee is not assigned to a firm."
                        ));
            }


            /*
             * -------------------------------------------------
             * BUILD ATTENDANCE REQUEST
             * -------------------------------------------------
             */

            AttendancePunchRequest punch =
                    new AttendancePunchRequest();

            punch.setEmployeeCode(
                    employee.getEmployeeCode()
            );

            punch.setEmployeeName(
                    employee.getName()
            );

            punch.setDepartment(
                    employee.getDepartment()
            );

            /*
             * Employee Master currently does not have a
             * separate team field.
             */
            punch.setTeam(
                    employee.getDepartment()
            );


            /*
             * Shift comes from Employee Master.
             */
            punch.setShift(
                    mapShift(
                            employee.getShiftLength()
                    )
            );

            punch.setRecordedBy(
                    employee.getEmployeeCode()
            );

            punch.setFirmCode(
                    firmCode
            );


            /*
             * Employee GPS
             */
            punch.setLatitude(
                    req.getLatitude()
            );

            punch.setLongitude(
                    req.getLongitude()
            );


            AttendanceRecord record =
                    attendanceService.checkIn(punch);


            return ResponseEntity.ok(record);

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            ex.getMessage()
                    ));

        } catch (IllegalStateException ex) {

            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            ex.getMessage()
                    ));
        }
    }


    /*
     * =========================================================
     * EMPLOYEE SELF CHECK-OUT
     * =========================================================
     *
     * IMPORTANT:
     *
     * Employee checkout MUST send GPS.
     *
     * Example request:
     *
     * {
     *     "latitude": 16.720236,
     *     "longitude": 74.460701
     * }
     *
     * AttendanceService validates that the employee is
     * within the allowed 150m company radius.
     */

    @PostMapping("/checkout")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<?> checkOut(
            Authentication authentication,
            @RequestBody SelfCheckInRequest req) {

        try {

            String employeeCode =
                    resolveEmployeeCode(authentication);


            /*
             * Get employee to resolve firm.
             */

            EmployeeDto employee =
                    employeeService.getEmployeeByCode(
                            employeeCode
                    );


            if (employee == null) {

                return ResponseEntity
                        .badRequest()
                        .body(Map.of(
                                "message",
                                "Employee record not found."
                        ));
            }


            /*
             * -------------------------------------------------
             * GET FIRM
             * -------------------------------------------------
             */

            String firmCode = null;

            if (employee.getFirmId() != null) {

                firmCode =
                        firmRepository
                                .findById(employee.getFirmId())
                                .map(Firm::getCode)
                                .orElse(null);
            }


            if (firmCode == null ||
                    firmCode.isBlank()) {

                return ResponseEntity
                        .badRequest()
                        .body(Map.of(
                                "message",
                                "Employee is not assigned to a firm."
                        ));
            }


            /*
             * -------------------------------------------------
             * BUILD CHECKOUT REQUEST
             * -------------------------------------------------
             *
             * recordedBy = employee itself
             *
             * latitude/longitude = current employee location
             */

            AttendanceCheckoutRequest checkoutRequest =
                    new AttendanceCheckoutRequest();

            checkoutRequest.setFirmCode(
                    firmCode
            );

            checkoutRequest.setRecordedBy(
                    employee.getEmployeeCode()
            );

            checkoutRequest.setLatitude(
                    req.getLatitude()
            );

            checkoutRequest.setLongitude(
                    req.getLongitude()
            );


            /*
             * -------------------------------------------------
             * CALL COMMON CHECKOUT SERVICE
             * -------------------------------------------------
             *
             * This is the same service used by the attendance
             * controller.
             *
             * Therefore:
             *
             * Employee
             *    ↓
             * GPS validation
             *    ↓
             * Existing attendance record
             *    ↓
             * Checkout
             *    ↓
             * OT calculation
             *    ↓
             * COMPLETED
             */

            AttendanceRecord record =
                    attendanceService.checkOut(
                            employeeCode,
                            checkoutRequest
                    );


            return ResponseEntity.ok(record);

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            ex.getMessage()
                    ));

        } catch (IllegalStateException ex) {

            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            ex.getMessage()
                    ));
        }
    }


    /*
     * =========================================================
     * GET MONTHLY ATTENDANCE
     * =========================================================
     */

    @GetMapping
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<?> getMyAttendance(
            Authentication authentication,
            @RequestParam String month) {

        String employeeCode =
                resolveEmployeeCode(authentication);


        YearMonth ym;

        try {

            ym = YearMonth.parse(month);

        } catch (Exception ex) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            "month must be in YYYY-MM format."
                    ));
        }


        LocalDate from =
                ym.atDay(1);

        LocalDate to =
                ym.atEndOfMonth();


        return ResponseEntity.ok(
                attendanceService.getMyAttendanceRange(
                        employeeCode,
                        from,
                        to
                )
        );
    }


    /*
     * =========================================================
     * SHIFT MAPPING
     * =========================================================
     *
     * Employee Master stores shift length.
     *
     * Current mapping:
     *
     * 12 → TWELVE_HOURS
     * 8  → EIGHT_HOURS
     * otherwise → GENERAL
     *
     * If Employee Master later stores Morning/Evening/General
     * explicitly, this method should be changed to use that
     * actual shift value instead.
     */

    private String mapShift(Integer shiftLength) {

        if (shiftLength != null &&
                shiftLength == 12) {

            return "TWELVE_HOURS";
        }

        if (shiftLength != null &&
                shiftLength == 8) {

            return "EIGHT_HOURS";
        }

        return "GENERAL";
    }


    /*
     * =========================================================
     * RESOLVE EMPLOYEE CODE
     * =========================================================
     */

    private String resolveEmployeeCode(
            Authentication authentication) {

        User user =
                userService
                        .getUserByEmail(
                                authentication.getName()
                        )
                        .orElseThrow(
                                () -> new IllegalStateException(
                                        "Authenticated user not found"
                                )
                        );


        if (user.getEmployeeCode() == null ||
                user.getEmployeeCode().isBlank()) {

            throw new IllegalStateException(
                    "This account is not linked to an employee record."
            );
        }


        return user.getEmployeeCode();
    }
}