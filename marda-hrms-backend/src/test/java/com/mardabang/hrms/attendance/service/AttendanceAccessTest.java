package com.mardabang.hrms.attendance.service;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import com.mardabang.hrms.user.entity.*;
import com.mardabang.hrms.user.service.UserService;
import com.mardabang.hrms.employee.entity.Employee;
import com.mardabang.hrms.employee.repository.EmployeeRepository;
import com.mardabang.hrms.firms.entity.Firm;
import com.mardabang.hrms.firms.repository.FirmRepository;
import com.mardabang.hrms.attendance.dto.*;
class AttendanceAccessTest {
    UserService users=mock(UserService.class);EmployeeRepository employees=mock(EmployeeRepository.class);FirmRepository firms=mock(FirmRepository.class);
    AttendanceAccess access=new AttendanceAccess(users,employees,firms);
    Firm firm=new Firm(1L,"MBIPL","Office",true);User user;Employee employee;
    @BeforeEach void setup(){user=User.builder().id(5L).role(Role.INPUTER).active(true).loginId("phone").firms(Set.of(firm)).build();employee=new Employee();employee.setEmployeeCode("EMP1");employee.setFirmId(1L);employee.setActive(true);employee.setName("Actual Name");employee.setDepartment("Sizing");employee.setShiftLength(12);when(users.getUserByPrincipal("phone")).thenReturn(Optional.of(user));when(employees.findForAttendance("EMP1")).thenReturn(Optional.of(employee));when(firms.findByCode("MBIPL")).thenReturn(Optional.of(firm));SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("phone","",List.of()));}
    @AfterEach void clear(){SecurityContextHolder.clearContext();}
    AttendancePunchRequest punch(){var r=new AttendancePunchRequest();r.setEmployeeCode("EMP1");r.setFirmCode("MBIPL");r.setEmployeeName("Forged");r.setDepartment("Forged");r.setShift("GENERAL");r.setRecordedBy("Forged");return r;}
    @Test void supervisorCannotReadAllCompanies(){assertThrows(ResponseStatusException.class,()->access.readCompany(null));}
    @Test void unassignedSupervisorCannotPunch(){user.setFirms(Set.of());assertThrows(ResponseStatusException.class,()->access.checkIn(punch()));}
    @Test void employeeCannotPunchAnotherEmployee(){user.setRole(Role.EMPLOYEE);user.setEmployeeCode("OTHER");assertThrows(ResponseStatusException.class,()->access.checkIn(punch()));}
    @Test void rejectsWrongCompany(){employee.setFirmId(2L);assertThrows(ResponseStatusException.class,()->access.checkIn(punch()));}
    @Test void inactiveEmployeeCannotPunch(){employee.setActive(false);assertThrows(ResponseStatusException.class,()->access.checkIn(punch()));}
    @Test void inactiveAccountCannotRead(){user.setActive(false);assertThrows(ResponseStatusException.class,()->access.readCompany("MBIPL"));}
    @Test void replacesClientMetadataWithAuthoritativeValues(){var r=punch();assertEquals(AttendanceVerification.SUPERVISOR_RECORDED,access.checkIn(r));assertEquals("Actual Name",r.getEmployeeName());assertEquals("Sizing",r.getDepartment());assertEquals("TWELVE_HOURS",r.getShift());assertEquals("phone",r.getRecordedBy());verify(employees).findForAttendance("EMP1");}
    @Test void employeePunchUsesStrictGpsVerification(){user.setRole(Role.EMPLOYEE);user.setEmployeeCode("EMP1");assertEquals(AttendanceVerification.EMPLOYEE_GPS,access.checkIn(punch()));}
    @Test void adminPunchRecordsLocationWithoutGeofence(){user.setRole(Role.ADMIN);assertEquals(AttendanceVerification.ADMIN_RECORDED,access.checkIn(punch()));}
    @Test void employeesCannotUseManualBypass(){user.setRole(Role.EMPLOYEE);user.setEmployeeCode("EMP1");var r=new AttendanceManualRequest();r.setEmployeeCode("EMP1");r.setFirmCode("MBIPL");assertThrows(ResponseStatusException.class,()->access.manual(r));}
}
