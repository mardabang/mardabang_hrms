package com.mardabang.hrms.attendance.service;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import lombok.RequiredArgsConstructor;
import com.mardabang.hrms.user.entity.*;
import com.mardabang.hrms.user.service.UserService;
import com.mardabang.hrms.employee.entity.Employee;
import com.mardabang.hrms.employee.repository.EmployeeRepository;
import com.mardabang.hrms.firms.repository.FirmRepository;
import com.mardabang.hrms.attendance.dto.*;

@Service @RequiredArgsConstructor
public class AttendanceAccess {
    private final UserService users;
    private final EmployeeRepository employees;
    private final FirmRepository firms;
    private User actor() {
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth==null || !auth.isAuthenticated())throw denied("Please log in again.");
        User user=users.getUserByPrincipal(auth.getName()).orElseThrow(()->denied("Account not found."));
        if(!Boolean.TRUE.equals(user.getActive()))throw denied("Account is inactive.");
        return user;
    }
    private static ResponseStatusException denied(String reason){return new ResponseStatusException(HttpStatus.FORBIDDEN,reason);}
    public void readCompany(String firmCode) {
        User user=actor();
        if(user.getRole()==Role.ADMIN)return;
        if(user.getRole()!=Role.INPUTER || firmCode==null || firmCode.isBlank())throw denied("Select an assigned company.");
        var firm=firms.findByCode(firmCode).orElseThrow(()->denied("Company not found."));
        if(user.getFirms()==null || user.getFirms().stream().noneMatch(f->Objects.equals(f.getId(),firm.getId())))throw denied("Company is not assigned to you.");
    }
    private Employee authorize(User user,String code,String firmCode,boolean manual) {
        if(manual && user.getRole()!=Role.ADMIN && user.getRole()!=Role.INPUTER)throw denied("Manual attendance requires administrator or supervisor access.");
        if(code==null || code.isBlank() || firmCode==null || firmCode.isBlank())throw new IllegalArgumentException("Employee and company are required.");
        // Lock the employee even when no attendance row exists, serializing first punches.
        Employee employee=employees.findForAttendance(code).orElseThrow(()->new IllegalArgumentException("Employee not found."));
        var firm=firms.findByCode(firmCode).orElseThrow(()->new IllegalArgumentException("Company not found."));
        if(!Objects.equals(employee.getFirmId(),firm.getId()))throw denied("Employee does not belong to this company.");
        if(!Boolean.TRUE.equals(firm.getActive()))throw denied("Company is inactive.");
        if(user.getRole()==Role.EMPLOYEE) {
            if(manual || !Objects.equals(user.getEmployeeCode(),code))throw denied("You can punch only your own attendance.");
        } else if(user.getRole()==Role.INPUTER) {
            if(user.getFirms()==null || user.getFirms().stream().noneMatch(f->Objects.equals(f.getId(),firm.getId())))throw denied("Company is not assigned to you.");
        } else if(user.getRole()!=Role.ADMIN)throw denied("Attendance access is denied.");
        if(!manual && !Boolean.TRUE.equals(employee.getActive()))throw denied("Employee is inactive.");
        return employee;
    }
    private String recordedBy(User user) {
        if (user.getLoginId() != null && !user.getLoginId().isBlank()) return user.getLoginId();
        if (user.getEmail() != null && !user.getEmail().isBlank()) return user.getEmail();
        return "account-" + user.getId();
    }

    private String shift(Employee employee) {
        if (Integer.valueOf(12).equals(employee.getShiftLength())) return "TWELVE_HOURS";
        if (Integer.valueOf(8).equals(employee.getShiftLength())) return "EIGHT_HOURS";
        return "GENERAL";
    }

    private AttendanceVerification verificationFor(User user) {
        return switch (user.getRole()) {
            case EMPLOYEE -> AttendanceVerification.EMPLOYEE_GPS;
            case INPUTER -> AttendanceVerification.SUPERVISOR_RECORDED;
            case ADMIN -> AttendanceVerification.ADMIN_RECORDED;
        };
    }

    public AttendanceVerification checkIn(AttendancePunchRequest request) {
        User user = actor();
        Employee employee = authorize(user, request.getEmployeeCode(), request.getFirmCode(), false);
        request.setEmployeeName(employee.getName());
        request.setDepartment(employee.getDepartment());
        request.setShift(shift(employee));
        request.setRecordedBy(recordedBy(user));
        return verificationFor(user);
    }

    public AttendanceVerification checkOut(String employeeCode, AttendanceCheckoutRequest request) {
        User user = actor();
        authorize(user, employeeCode, request.getFirmCode(), false);
        request.setRecordedBy(recordedBy(user));
        return verificationFor(user);
    }

    public void manual(AttendanceManualRequest request) {
        User user = actor();
        Employee employee = authorize(user, request.getEmployeeCode(), request.getFirmCode(), true);
        request.setEmployeeName(employee.getName());
        request.setDepartment(employee.getDepartment());
        request.setShift(shift(employee));
        request.setRecordedBy(recordedBy(user));
    }
}
