package com.mardabang.hrms.department;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import com.mardabang.hrms.firms.entity.Firm;
import com.mardabang.hrms.firms.repository.FirmRepository;
import com.mardabang.hrms.user.entity.*;
import com.mardabang.hrms.user.service.UserService;
import com.mardabang.hrms.employee.dto.EmployeeDto;
import com.mardabang.hrms.employee.entity.Employee;

class DepartmentServiceTest {
    DepartmentRepository repo=mock(DepartmentRepository.class);
    FirmRepository firms=mock(FirmRepository.class);
    UserService users=mock(UserService.class);
    JdbcTemplate jdbc=mock(JdbcTemplate.class);
    DepartmentService service=new DepartmentService(repo,firms,users,jdbc);
    Firm firm=new Firm(1L,"MBIPL","Office",true);
    Department department=new Department();
    @BeforeEach void setup() {
        department.setId(10L);department.setFirm(firm);department.setName("Sizing");department.setNameKey("sizing");
        when(repo.findById(10L)).thenReturn(Optional.of(department));
        when(firms.findById(1L)).thenReturn(Optional.of(firm));
        when(users.getUserByPrincipal("admin")).thenReturn(Optional.of(User.builder().role(Role.ADMIN).active(true).build()));
        when(repo.saveAndFlush(any())).thenAnswer(invocation->invocation.getArgument(0));
    }
    EmployeeDto dto() {EmployeeDto d=new EmployeeDto();d.setFirmId(1L);d.setDepartmentId(10L);return d;}
    @Test void canonicalNames() {assertEquals("size preparation",DepartmentService.key("  Size   Preparation  "));assertThrows(IllegalArgumentException.class,()->DepartmentService.normalize(" "));}
    @Test void rejectsWrongCompany() {EmployeeDto d=dto();d.setFirmId(2L);assertThrows(IllegalArgumentException.class,()->service.resolve(d,null));}
    @Test void rejectsInactiveNewAssignment() {department.setActive(false);assertThrows(IllegalArgumentException.class,()->service.resolve(dto(),null));}
    @Test void retainsInactiveExistingAssignment() {department.setActive(false);Employee e=new Employee();e.setFirmId(1L);e.setDepartmentRecord(department);assertSame(department,service.resolve(dto(),e));}
    @Test void usesCanonicalNameInsteadOfClientText() {EmployeeDto d=dto();d.setDepartment("Wrong");service.resolve(d,null);assertEquals("Sizing",d.getDepartment());}
    @Test void rejectsSupervisorWrites() {when(users.getUserByPrincipal("supervisor")).thenReturn(Optional.of(User.builder().role(Role.INPUTER).active(true).firms(Set.of(firm)).build()));assertEquals(403,assertThrows(ResponseStatusException.class,()->service.create(1L,"Stores","supervisor")).getStatusCode().value());verify(repo,never()).saveAndFlush(any());}
    @Test void rejectsUnassignedCompanyReads() {when(users.getUserByPrincipal("employee")).thenReturn(Optional.of(User.builder().role(Role.EMPLOYEE).active(true).build()));assertEquals(403,assertThrows(ResponseStatusException.class,()->service.list(1L,true,"employee")).getStatusCode().value());}
    @Test void preventsCaseInsensitiveDuplicates() {when(repo.findByFirmIdAndNameKey(1L,"sizing")).thenReturn(Optional.of(department));assertEquals(409,assertThrows(ResponseStatusException.class,()->service.create(1L," SIZING ","admin")).getStatusCode().value());}
    @Test void deactivationPreservesEmployeeReferences() {assertFalse(service.update(10L,null,false,"admin").active());verifyNoInteractions(jdbc);}
    @Test void renameUpdatesEmployeeNameOnly() {assertEquals("Warping",service.update(10L,"Warping",null,"admin").name());verify(jdbc).update("UPDATE employees SET department=? WHERE department_id=?","Warping",10L);verifyNoMoreInteractions(jdbc);}
}
