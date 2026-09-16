package com.mardabang.hrms.leave.service;

import com.mardabang.hrms.user.entity.*;
import com.mardabang.hrms.user.repository.UserRepository;
import com.mardabang.hrms.employee.entity.Employee;
import com.mardabang.hrms.employee.repository.EmployeeRepository;
import com.mardabang.hrms.firms.entity.Firm;
import com.mardabang.hrms.firms.repository.FirmRepository;
import com.mardabang.hrms.leave.entity.LeaveRequest;
import com.mardabang.hrms.leave.repository.LeaveRepository;
import com.mardabang.hrms.leave.LeavePolicy;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LeaveServiceTest {
    LeaveRepository leaves = mock(LeaveRepository.class);
    UserRepository users = mock(UserRepository.class);
    EmployeeRepository employees = mock(EmployeeRepository.class);
    FirmRepository firms = mock(FirmRepository.class);
    LeavePolicy policy = new LeavePolicy(2, "SUNDAY", "", "Asia/Kolkata");
    LeaveService service = new LeaveService(leaves, users, employees, firms, policy, mock(EntityManager.class));
    Firm firm = new Firm(1L, "MBIPL", "Firm", true);
    User supervisor, employeeUser, admin;
    Employee employee;
    LeaveRequest request;

    @BeforeEach void setup() {
        supervisor = user(10L, Role.INPUTER);
        employeeUser = user(20L, Role.EMPLOYEE);
        admin = user(30L, Role.ADMIN);
        employeeUser.setEmployeeCode("EMP-1");
        employee = new Employee(); employee.setId(40L); employee.setFirmId(1L);
        employee.setEmployeeCode("EMP-1"); employee.setName("Employee"); employee.setActive(true); employee.setCreatedByUserId(10L);
        when(employees.findById(40L)).thenReturn(Optional.of(employee));
        when(employees.findByEmployeeCode("EMP-1")).thenReturn(Optional.of(employee));
        when(firms.findById(1L)).thenReturn(Optional.of(firm));
        when(firms.findByCode("MBIPL")).thenReturn(Optional.of(firm));
        request = new LeaveRequest(); request.setId(1L); request.setOwnerId(20L); request.setEmployeeId(40L);
        request.setFirmId(1L); request.setFirmCode("MBIPL"); request.setOwnerRole("EMPLOYEE");
        request.setDays(2); request.setStatus("Pending");
        when(leaves.lockById(1L)).thenReturn(Optional.of(request));
        when(leaves.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }
    User user(Long id, Role role) {
        User u = User.builder().id(id).email(id + "@example.test").fullName(role.name()).role(role).active(true).firms(Set.of(firm)).build();
        when(users.findByEmail(u.getEmail())).thenReturn(Optional.of(u));
        when(users.findById(id)).thenReturn(Optional.of(u));
        return u;
    }
    @Test void assignedSupervisorCanApproveTwoDaysAndDecisionIsRecorded() {
        var result = service.review(supervisor.getEmail(), 1L, "Approved", "Approved by supervisor");
        assertEquals("Approved", result.get("status"));
        assertEquals("Supervisor", result.get("reviewerRole"));
        assertEquals(10L, request.getReviewerId());
        assertNotNull(request.getReviewedAt());
    }
    @Test void supervisorCannotDecideLongerRequest() {
        request.setDays(3);
        assertThrows(ResponseStatusException.class, () -> service.review(supervisor.getEmail(), 1L, "Approved", ""));
        assertTrue(service.canReview(admin, request));
    }
    @Test void supervisorCannotReviewOtherSupervisorsLeave() {
        request.setOwnerRole("INPUTER");
        assertFalse(service.canReview(supervisor, request));
        assertTrue(service.canReview(admin, request));
    }
    @Test void supervisorCannotReviewPromotedEmployeesLeave() {
        employeeUser.setRole(Role.INPUTER);
        assertFalse(service.canReview(supervisor, request));
    }
    @Test void noSelfApprovalEvenForAdmin() {
        request.setOwnerId(admin.getId());
        assertFalse(service.canReview(admin, request));
    }
    @Test void unassignedAndOtherFirmRequestsAreDenied() {
        employee.setCreatedByUserId(99L);
        assertFalse(service.canReview(supervisor, request));
        employee.setCreatedByUserId(10L); request.setFirmId(2L);
        assertFalse(service.canReview(supervisor, request));
    }
    @Test void rejectionNeedsReason() {
        assertThrows(ResponseStatusException.class, () -> service.review(admin.getEmail(), 1L, "Rejected", "  "));
        assertEquals("Pending", request.getStatus());
    }
    @Test void decidedLeaveCannotBeReviewedAgainOrCancelled() {
        request.setStatus("Approved");
        assertThrows(ResponseStatusException.class, () -> service.review(admin.getEmail(), 1L, "Rejected", "changed"));
        assertThrows(ResponseStatusException.class, () -> service.cancel(employeeUser.getEmail(), 1L));
    }
    @Test void onlyOwnerCanCancelPendingLeave() {
        assertThrows(ResponseStatusException.class, () -> service.cancel(supervisor.getEmail(), 1L));
        assertEquals("Cancelled", service.cancel(employeeUser.getEmail(), 1L).get("status"));
        assertNotNull(request.getCancelledAt());
    }
    @Test void adminSeesSupervisorDecisionsAndEmployeesSeeOnlyTheirOwn() {
        request.setStatus("Approved"); request.setReviewerName("Supervisor");
        when(leaves.findByFirmIdOrderBySubmittedAtDesc(1L)).thenReturn(List.of(request));
        assertEquals("Supervisor", service.list(admin.getEmail(), "MBIPL", false).get(0).get("reviewerName"));
        when(leaves.findByOwnerIdOrderBySubmittedAtDesc(20L)).thenReturn(List.of(request));
        service.list(employeeUser.getEmail(), null, false);
        verify(leaves).findByOwnerIdOrderBySubmittedAtDesc(20L);
    }
    @Test void crossFirmListIsForbidden() {
        supervisor.setFirms(Set.of());
        assertThrows(ResponseStatusException.class, () -> service.list(supervisor.getEmail(), "MBIPL", false));
    }
    @Test void submissionUsesAuthenticatedEmployeeAndRealWorkingDays() {
        LocalDate from = nextMonday();
        var result = service.submit(employeeUser.getEmail(), null, "Sick Leave", from, from.plusDays(1), "Appointment");
        assertEquals("EMP-1", result.get("employeeCode"));
        assertEquals("MBIPL", result.get("firmCode"));
        assertEquals(2, result.get("days"));
        assertEquals("Pending", result.get("status"));
    }
    @Test void overlappingRequestIsRejected() {
        when(leaves.overlaps(any(), any(), any())).thenReturn(true);
        assertThrows(ResponseStatusException.class, () -> service.submit(employeeUser.getEmail(), null, "Sick Leave", nextMonday(), nextMonday(), "Reason"));
        verify(leaves, never()).save(any());
    }
    @Test void invalidOrPastDatesAndWrongFirmAreRejected() {
        assertThrows(ResponseStatusException.class, () -> service.submit(employeeUser.getEmail(), "WRONG", "Sick Leave", nextMonday(), nextMonday(), "Reason"));
        assertThrows(ResponseStatusException.class, () -> service.submit(employeeUser.getEmail(), null, "Sick Leave", LocalDate.now(policy.zone).minusDays(1), nextMonday(), "Reason"));
        assertThrows(ResponseStatusException.class, () -> service.submit(employeeUser.getEmail(), null, "Unknown", nextMonday(), nextMonday(), "Reason"));
    }
    @Test void supervisorWithoutEmployeeRecordCanApplyToAssignedFirmForAdminReview() {
        var result = service.submit(supervisor.getEmail(), "MBIPL", "Sick Leave", nextMonday(), nextMonday(), "Appointment");
        assertEquals(true, result.get("requiresAdmin"));
    }
    @Test void weeklyOffsAndHolidaysAreExcluded() {
        LeavePolicy custom = new LeavePolicy(2, "SUNDAY", "2030-01-07", "Asia/Kolkata");
        assertEquals(1, custom.days(LocalDate.of(2030, 1, 5), LocalDate.of(2030, 1, 7)));
        assertEquals(0, custom.days(LocalDate.of(2030, 1, 6), LocalDate.of(2030, 1, 6)));
        assertThrows(IllegalArgumentException.class, () -> custom.days(null, nextMonday()));
    }
    LocalDate nextMonday() {
        return LocalDate.now(policy.zone).plusDays(1).with(java.time.temporal.TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));
    }
}
