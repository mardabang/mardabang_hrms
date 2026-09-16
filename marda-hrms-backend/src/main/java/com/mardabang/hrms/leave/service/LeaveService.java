package com.mardabang.hrms.leave.service;

import com.mardabang.hrms.employee.entity.Employee;
import com.mardabang.hrms.employee.repository.EmployeeRepository;
import com.mardabang.hrms.firms.entity.Firm;
import com.mardabang.hrms.firms.repository.FirmRepository;
import com.mardabang.hrms.leave.LeavePolicy;
import com.mardabang.hrms.leave.entity.LeaveRequest;
import com.mardabang.hrms.leave.repository.LeaveRepository;
import com.mardabang.hrms.user.entity.User;
import com.mardabang.hrms.user.entity.Role;
import com.mardabang.hrms.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.*;
import java.util.*;

@Service
@Transactional
public class LeaveService {
    private final LeaveRepository leaves;
    private final UserRepository users;
    private final EmployeeRepository employees;
    private final FirmRepository firms;
    private final LeavePolicy policy;
    private final EntityManager em;
    private static final Set<String> TYPES = Set.of("Casual Leave", "Sick Leave", "Earned Leave", "Unpaid Leave");

    public LeaveService(LeaveRepository leaves, UserRepository users, EmployeeRepository employees,
                        FirmRepository firms, LeavePolicy policy, EntityManager em) {
        this.leaves = leaves; this.users = users; this.employees = employees;
        this.firms = firms; this.policy = policy; this.em = em;
    }

    private User actor(String email) {
        User user = users.findByLoginId(email).or(() -> users.findByEmail(email)).orElseThrow(() -> failure(HttpStatus.FORBIDDEN, "Account not found."));
        if (!Boolean.TRUE.equals(user.getActive())) throw failure(HttpStatus.FORBIDDEN, "Account is inactive.");
        return user;
    }
    private Employee linked(User user) {
        return user.getEmployeeCode() == null ? null : employees.findByEmployeeCode(user.getEmployeeCode()).orElse(null);
    }
    private boolean firmAllowed(User user, Long id) {
        return user.getRole() == Role.ADMIN || (user.getFirms() != null && user.getFirms().stream().anyMatch(f -> Objects.equals(f.getId(), id)));
    }
    private boolean assigned(User user, LeaveRequest request) {
        if (request.getEmployeeId() == null) return false;
        return employees.findById(request.getEmployeeId())
            .map(e -> Objects.equals(e.getCreatedByUserId(), user.getId()) && Objects.equals(e.getFirmId(), request.getFirmId()))
            .orElse(false);
    }
    boolean canReview(User user, LeaveRequest r) {
        if (!"Pending".equals(r.getStatus()) || Objects.equals(user.getId(), r.getOwnerId()) || !firmAllowed(user, r.getFirmId())) return false;
        if (user.getRole() == Role.ADMIN) return true;
        // Current role is checked as well as the submission snapshot after promotions.
        boolean employeeOwner = users.findById(r.getOwnerId()).map(u -> u.getRole() == Role.EMPLOYEE).orElse(false);
        return user.getRole() == Role.INPUTER && "EMPLOYEE".equals(r.getOwnerRole()) && employeeOwner
            && r.getDays() <= policy.supervisorLimit && assigned(user, r);
    }

    public List<Map<String, Object>> list(String email, String firmCode, boolean mine) {
        User user = actor(email);
        if (mine || user.getRole() == Role.EMPLOYEE) {
            return leaves.findByOwnerIdOrderBySubmittedAtDesc(user.getId()).stream()
                .filter(r -> firmCode == null || firmCode.isBlank() || r.getFirmCode().equals(firmCode))
                .map(r -> view(user, r)).toList();
        }
        if (firmCode == null || firmCode.isBlank()) throw failure(HttpStatus.BAD_REQUEST, "Select a firm.");
        Firm firm = firms.findByCode(firmCode).orElseThrow(() -> failure(HttpStatus.NOT_FOUND, "Firm not found."));
        if (!firmAllowed(user, firm.getId())) throw failure(HttpStatus.FORBIDDEN, "This firm is not assigned to you.");
        return leaves.findByFirmIdOrderBySubmittedAtDesc(firm.getId()).stream()
            .filter(r -> user.getRole() == Role.ADMIN || assigned(user, r))
            .map(r -> view(user, r)).toList();
    }

    public Map<String, Object> submit(String email, String firmCode, String type, LocalDate from, LocalDate to, String reason) {
        User user = actor(email);
        if (user.getRole() == Role.ADMIN) throw failure(HttpStatus.FORBIDDEN, "Use an employee account to apply for leave.");
        // Serialize submissions for the same account to prevent concurrent overlaps.
        em.lock(user, LockModeType.PESSIMISTIC_WRITE);
        Employee employee = linked(user);
        if (user.getRole() == Role.EMPLOYEE && employee == null) throw failure(HttpStatus.BAD_REQUEST, "Your account is not linked to an employee. Contact admin.");
        Firm firm;
        if (employee != null) {
            if (!Boolean.TRUE.equals(employee.getActive())) throw failure(HttpStatus.FORBIDDEN, "Employee is inactive.");
            firm = firms.findById(employee.getFirmId()).orElseThrow(() -> failure(HttpStatus.BAD_REQUEST, "Employee firm is missing."));
            if (firmCode != null && !firmCode.isBlank() && !firm.getCode().equals(firmCode)) throw failure(HttpStatus.BAD_REQUEST, "Apply under your allocated firm.");
        } else {
            firm = firms.findByCode(firmCode == null ? "" : firmCode).orElseThrow(() -> failure(HttpStatus.BAD_REQUEST, "Select your firm."));
            if (!firmAllowed(user, firm.getId())) throw failure(HttpStatus.FORBIDDEN, "This firm is not assigned to you.");
        }
        if (!Boolean.TRUE.equals(firm.getActive())) throw failure(HttpStatus.BAD_REQUEST, "This firm is inactive.");
        if (!TYPES.contains(type == null ? "" : type)) throw failure(HttpStatus.BAD_REQUEST, "Choose a valid leave type.");
        int days;
        try { days = policy.days(from, to); } catch (IllegalArgumentException ex) { throw failure(HttpStatus.BAD_REQUEST, ex.getMessage()); }
        if (from.isBefore(LocalDate.now(policy.zone))) throw failure(HttpStatus.BAD_REQUEST, "Choose today or a future date.");
        if (days == 0) throw failure(HttpStatus.BAD_REQUEST, "The selected dates contain no working days.");
        if (reason == null || reason.isBlank() || reason.trim().length() > 1000) throw failure(HttpStatus.BAD_REQUEST, "Enter a reason of 1 to 1000 characters.");
        if (leaves.overlaps(user.getId(), from, to)) throw failure(HttpStatus.CONFLICT, "You already have pending or approved leave during these dates.");
        LeaveRequest r = new LeaveRequest();
        r.setOwnerId(user.getId()); r.setOwnerRole(user.getRole().name());
        r.setEmployeeId(employee == null ? null : employee.getId());
        r.setEmployeeCode(employee == null ? user.getEmployeeCode() : employee.getEmployeeCode());
        r.setEmployeeName(employee == null ? user.getFullName() : employee.getName());
        r.setFirmId(firm.getId()); r.setFirmCode(firm.getCode()); r.setType(type);
        r.setFromDate(from); r.setToDate(to); r.setDays(days); r.setReason(reason.trim());
        r.setStatus("Pending"); r.setSubmittedAt(Instant.now());
        return view(user, leaves.save(r));
    }

    public Map<String, Object> review(String email, Long id, String status, String note) {
        User user = actor(email);
        LeaveRequest r = leaves.lockById(id).orElseThrow(() -> failure(HttpStatus.NOT_FOUND, "Leave request not found."));
        if (!canReview(user, r)) throw failure(HttpStatus.FORBIDDEN, "You cannot review this request, or it has already been decided.");
        if (!Set.of("Approved", "Rejected").contains(status == null ? "" : status)) throw failure(HttpStatus.BAD_REQUEST, "Choose approve or reject.");
        if (note != null && note.length() > 1000) throw failure(HttpStatus.BAD_REQUEST, "Remarks cannot exceed 1000 characters.");
        if ("Rejected".equals(status) && (note == null || note.isBlank())) throw failure(HttpStatus.BAD_REQUEST, "Enter a rejection reason.");
        r.setStatus(status); r.setReviewNote(note == null ? "" : note.trim());
        r.setReviewerId(user.getId()); r.setReviewerName(user.getFullName());
        r.setReviewerRole(user.getRole() == Role.INPUTER ? "Supervisor" : "Admin"); r.setReviewedAt(Instant.now());
        return view(user, leaves.save(r));
    }

    public Map<String, Object> cancel(String email, Long id) {
        User user = actor(email);
        LeaveRequest r = leaves.lockById(id).orElseThrow(() -> failure(HttpStatus.NOT_FOUND, "Leave request not found."));
        if (!Objects.equals(r.getOwnerId(), user.getId())) throw failure(HttpStatus.FORBIDDEN, "You can only cancel your own request.");
        if (!"Pending".equals(r.getStatus())) throw failure(HttpStatus.CONFLICT, "Only pending requests can be cancelled.");
        r.setStatus("Cancelled"); r.setCancelledAt(Instant.now());
        return view(user, leaves.save(r));
    }

    private Map<String, Object> view(User user, LeaveRequest r) {
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("id", r.getId()); v.put("firmCode", r.getFirmCode()); v.put("employeeCode", r.getEmployeeCode());
        v.put("employeeName", r.getEmployeeName()); v.put("type", r.getType());
        v.put("from", r.getFromDate()); v.put("to", r.getToDate()); v.put("days", r.getDays());
        v.put("reason", r.getReason()); v.put("status", r.getStatus()); v.put("submittedAt", r.getSubmittedAt());
        v.put("reviewerName", r.getReviewerName()); v.put("reviewerRole", r.getReviewerRole());
        v.put("reviewedAt", r.getReviewedAt()); v.put("reviewNote", r.getReviewNote());
        v.put("cancelledAt", r.getCancelledAt()); v.put("canReview", canReview(user, r));
        v.put("canCancel", Objects.equals(user.getId(), r.getOwnerId()) && "Pending".equals(r.getStatus()));
        v.put("requiresAdmin", !"EMPLOYEE".equals(r.getOwnerRole()) || r.getDays() > policy.supervisorLimit);
        return v;
    }
    private static ResponseStatusException failure(HttpStatus status, String message) { return new ResponseStatusException(status, message); }
}
