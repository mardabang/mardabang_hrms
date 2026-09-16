package com.mardabang.hrms;

import com.mardabang.hrms.auth.controller.AuthController;
import com.mardabang.hrms.auth.dto.RegisterRequest;
import com.mardabang.hrms.auth.security.JwtUtil;
import com.mardabang.hrms.auth.service.OtpService;
import com.mardabang.hrms.auth.service.PasswordResetService;
import com.mardabang.hrms.employee.dto.EmployeeDto;
import com.mardabang.hrms.employee.service.EmployeeService;
import com.mardabang.hrms.firms.entity.Firm;
import com.mardabang.hrms.firms.repository.FirmRepository;
import com.mardabang.hrms.user.entity.*;
import com.mardabang.hrms.user.service.UserService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import jakarta.validation.Validation;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserAccessRegistrationTest {
    UserService users = mock(UserService.class);
    EmployeeService employees = mock(EmployeeService.class);
    FirmRepository firms = mock(FirmRepository.class);
    AuthController controller = new AuthController(users, mock(JwtUtil.class), mock(PasswordEncoder.class), employees, mock(PasswordResetService.class), firms);
    Firm firm = new Firm(1L, "MBIPL", "Firm", true);
    EmployeeDto employee = new EmployeeDto();
    RegisterRequest request = new RegisterRequest();
    @BeforeEach void setup() {
        request.setFullName("Supervisor"); request.setEmail("supervisor@example.test");
        request.setMobile("9876543210"); request.setEmployeeCode("EMP-TEST"); request.setRole(Role.INPUTER);
        employee.setEmployeeCode("EMP-TEST"); employee.setFirmId(1L); employee.setActive(true);
        when(employees.getEmployeeByCode("EMP-TEST")).thenReturn(employee);
        when(firms.findById(1L)).thenReturn(Optional.of(firm));
    }
    @Test void supervisorIsCreatedWithoutPasswordAndWithEmployeesFirm() {
        assertEquals(201, controller.register(request).getStatusCode().value());
        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).saveUser(saved.capture());
        assertEquals(Role.INPUTER, saved.getValue().getRole());
        assertEquals("9876543210", saved.getValue().getMobile());
        assertTrue(saved.getValue().getFirms().contains(firm));
        assertEquals("EMP-TEST", saved.getValue().getEmployeeCode());
    }
    @Test void missingOrInactiveFirmPreventsRegistration() {
        when(firms.findById(1L)).thenReturn(Optional.empty());
        assertEquals(400, controller.register(request).getStatusCode().value());
        verify(users, never()).saveUser(any());
    }
    @Test void inactiveEmployeePreventsRegistration() {
        employee.setActive(false);
        assertEquals(400, controller.register(request).getStatusCode().value());
        verify(users, never()).saveUser(any());
    }
    @Test void existingLinkedAccountCannotBeDuplicated() {
        when(users.employeeCodeExists("EMP-TEST")).thenReturn(true);
        assertEquals(409, controller.register(request).getStatusCode().value());
    }
    @Test void adminRequiresPasswordButNoEmployeeCode() {
        request.setRole(Role.ADMIN); request.setEmployeeCode(null);
        assertEquals(400, controller.register(request).getStatusCode().value());
        request.setPassword("long-admin-password");
        assertEquals(201, controller.register(request).getStatusCode().value());
    }
    @Test void invalidMobileFailsBeanValidationWhileNullSupervisorPasswordIsAllowed() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertTrue(factory.getValidator().validate(request).isEmpty());
            request.setMobile("12345");
            assertTrue(factory.getValidator().validate(request).stream().anyMatch(v -> v.getPropertyPath().toString().equals("mobile")));
        }
    }
}
