package com.mardabang.hrms;

import com.mardabang.hrms.auth.security.JwtAuthenticationFilter;
import com.mardabang.hrms.config.SecurityConfig;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringJUnitConfig(AttendancePermissionsTest.Config.class)
@WebAppConfiguration
class AttendancePermissionsTest {
    @Configuration
    @EnableWebSecurity
    @EnableWebMvc
    @Import(SecurityConfig.class)
    static class Config {
        @Bean JwtAuthenticationFilter jwtAuthenticationFilter() throws Exception {
            JwtAuthenticationFilter filter = mock(JwtAuthenticationFilter.class);
            doAnswer(call -> {
                ((FilterChain) call.getArgument(2)).doFilter(call.getArgument(0), call.getArgument(1));
                return null;
            }).when(filter).doFilter(any(), any(), any());
            return filter;
        }
        @Bean Endpoints endpoints() { return new Endpoints(); }
    }
    @RestController
    static class Endpoints {
        @PostMapping({"/api/attendance/checkin", "/api/attendance/manual", "/api/me/attendance/checkin"})
        String attendance() { return "ok"; }
    }
    @Autowired WebApplicationContext context;
    MockMvc mvc;
    @BeforeEach void setup() { mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build(); }
    @Test @WithMockUser(roles = "EMPLOYEE") void employeeCannotUseGeneralAttendanceWrites() throws Exception {
        mvc.perform(post("/api/attendance/checkin")).andExpect(status().isForbidden());
        mvc.perform(post("/api/attendance/manual")).andExpect(status().isForbidden());
    }
    @Test @WithMockUser(roles = "EMPLOYEE") void employeeCanUseSelfAttendance() throws Exception {
        mvc.perform(post("/api/me/attendance/checkin")).andExpect(status().isOk());
    }
    @Test @WithMockUser(roles = "INPUTER") void supervisorCanUseGeneralAttendance() throws Exception {
        mvc.perform(post("/api/attendance/checkin")).andExpect(status().isOk());
    }
    @Test @WithMockUser(roles = "ADMIN") void adminCanUseGeneralAttendance() throws Exception {
        mvc.perform(post("/api/attendance/manual")).andExpect(status().isOk());
    }
    @Test void anonymousCannotCheckIn() throws Exception {
        mvc.perform(post("/api/attendance/checkin")).andExpect(status().isForbidden());
    }
}
