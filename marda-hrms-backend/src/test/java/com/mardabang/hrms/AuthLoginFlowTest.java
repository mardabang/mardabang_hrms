package com.mardabang.hrms;
import com.mardabang.hrms.auth.controller.AuthController;
import com.mardabang.hrms.auth.dto.*;
import com.mardabang.hrms.auth.security.JwtUtil;
import com.mardabang.hrms.auth.service.PasswordResetService;
import com.mardabang.hrms.employee.service.EmployeeService;
import com.mardabang.hrms.employee.dto.EmployeeDto;
import com.mardabang.hrms.firms.repository.FirmRepository;
import com.mardabang.hrms.firms.entity.Firm;
import com.mardabang.hrms.user.entity.*;
import com.mardabang.hrms.user.service.UserService;
import com.mardabang.hrms.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class AuthLoginFlowTest {
    UserService users = mock(UserService.class);
    PasswordEncoder encoder = mock(PasswordEncoder.class);
    JwtUtil jwt = mock(JwtUtil.class);
    FirmRepository firms = mock(FirmRepository.class);
    EmployeeService employees = mock(EmployeeService.class);
    AuthController controller = new AuthController(users, jwt, encoder, employees, mock(PasswordResetService.class), firms);
    LoginRequest login(String id) { LoginRequest r = new LoginRequest(); r.setLoginId(id); r.setPassword("test-password"); return r; }
    User account(Role role) { return User.builder().id(1L).loginId("LEGACY-ID").email("person@example.test").mobile("9876543210").fullName("Person").role(role).password("hash").active(true).build(); }
    @BeforeEach void setup() { when(encoder.matches("test-password", "hash")).thenReturn(true); }
    @Test void adminUsesEmailWithLegacyInternalId() {
        when(users.getUserByEmail("person@example.test")).thenReturn(Optional.of(account(Role.ADMIN)));
        assertEquals(200, controller.login(login("person@example.test")).getStatusCode().value());
        verify(jwt).generateToken("LEGACY-ID", "ADMIN");
    }
    @Test void supervisorAndEmployeeUsePhone() {
        for (Role role : new Role[]{Role.INPUTER, Role.EMPLOYEE}) {
            when(users.getUserByMobile("9876543210")).thenReturn(Optional.of(account(role)));
            assertEquals(200, controller.login(login("9876543210")).getStatusCode().value());
        }
    }
    @Test void rejectsEmployeeEmailAndAdminPhone() {
        when(users.getUserByEmail("person@example.test")).thenReturn(Optional.of(account(Role.EMPLOYEE)));
        when(users.getUserByMobile("9876543210")).thenReturn(Optional.of(account(Role.ADMIN)));
        assertEquals(401, controller.login(login("person@example.test")).getStatusCode().value());
        assertEquals(401, controller.login(login("9876543210")).getStatusCode().value());
        verifyNoInteractions(jwt);
    }
    @Test void rejectsCustomIdsAndWrongPasswords() {
        assertEquals(401, controller.login(login("LEGACY-ID")).getStatusCode().value());
        when(users.getUserByMobile("9876543210")).thenReturn(Optional.of(account(Role.EMPLOYEE)));
        when(encoder.matches("test-password", "hash")).thenReturn(false);
        assertEquals(401, controller.login(login("9876543210")).getStatusCode().value());
    }
    @Test void legacyAccountWithoutLoginIdUsesEmailTokenSubject() {
        User user = account(Role.EMPLOYEE); user.setLoginId(null);
        when(users.getUserByMobile("9876543210")).thenReturn(Optional.of(user));
        assertEquals(200, controller.login(login("9876543210")).getStatusCode().value());
        verify(jwt).generateToken("person@example.test", "EMPLOYEE");
    }
    RegisterRequest registration(Role role) {
        RegisterRequest r = new RegisterRequest();r.setRole(role);r.setFullName("Person");r.setEmail("person@example.test");r.setMobile("9876543210");r.setLoginId("UNTRUSTED-ID");r.setPassword("test-password-123");return r;
    }
    @Test void derivesAdminIdFromEmail() {
        assertEquals(201, controller.register(registration(Role.ADMIN)).getStatusCode().value());
        ArgumentCaptor<User> user = ArgumentCaptor.forClass(User.class);verify(users).saveUser(user.capture());
        assertEquals("person@example.test", user.getValue().getLoginId());
    }
    @Test void derivesSupervisorIdFromPhone() {
        RegisterRequest r=registration(Role.INPUTER);r.setFirmCode("MBIPL");r.setEmployeeCode("SUP-1");
        when(firms.findByCode("MBIPL")).thenReturn(Optional.of(new Firm(1L,"MBIPL","Office",true)));
        EmployeeDto employee = new EmployeeDto();employee.setEmployeeCode("SUP-1");employee.setFirmId(1L);employee.setActive(true);
        when(employees.getEmployeeByCode("SUP-1")).thenReturn(employee);
        assertEquals(201, controller.register(r).getStatusCode().value());
        ArgumentCaptor<User> user = ArgumentCaptor.forClass(User.class);verify(users).saveUser(user.capture());
        assertEquals("9876543210", user.getValue().getLoginId());
    }
    @Test void principalLookupAcceptsPhoneIdsAndLegacyEmail() {
        UserRepository repository=mock(UserRepository.class);UserService service=new UserService(repository,encoder);
        User user=account(Role.EMPLOYEE);
        when(repository.findByLoginId("9876543210")).thenReturn(Optional.of(user));
        assertSame(user, service.getUserByPrincipal("9876543210").orElseThrow());
        when(repository.findByEmail("person@example.test")).thenReturn(Optional.of(user));
        assertSame(user, service.getUserByPrincipal("person@example.test").orElseThrow());
    }
}
