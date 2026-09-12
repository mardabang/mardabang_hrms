package com.mardabang.hrms;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class AuthRegistrationSecurityTests {

    private static final String REGISTRATION_REQUEST = """
            {
              "fullName": "Unauthorized User",
              "email": "unauthorized@example.com",
              "mobile": "9876543210",
              "employeeCode": "DMY001",
              "password": "LongTestPassword123!",
              "role": "INPUTER"
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void anonymousUsersCannotRegisterAccounts() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTRATION_REQUEST))
                .andExpect(status().isForbidden());
    }

    @Test
    void inputersCannotRegisterAccounts() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .with(user("inputer@example.com").roles("INPUTER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTRATION_REQUEST))
                .andExpect(status().isForbidden());
    }
}
