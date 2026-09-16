package com.mardabang.hrms.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.mardabang.hrms.auth.security.JwtAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter) {

        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http
            .csrf(csrf -> csrf.disable())

            .sessionManagement(session ->
                session.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS
                )
            )

            .authorizeHttpRequests(auth -> auth

                // -------------------------------------------------
                // Public authentication endpoints
                // -------------------------------------------------

                .requestMatchers("/error")
                .permitAll()

                .requestMatchers(
                    "/api/auth/login",
                    "/api/auth/forgot-password",
                    "/api/auth/reset-password"
                )
                .permitAll()

                // -------------------------------------------------
                // TEMPORARY:
                // Allow registration while we finish the
                // Admin/Supervisor account-management API.
                // -------------------------------------------------

                .requestMatchers(
                    HttpMethod.POST,
                    "/api/auth/register"
                )
                .permitAll()

                // -------------------------------------------------
                // Employee APIs
                // -------------------------------------------------

                .requestMatchers(
                    HttpMethod.GET,
                    "/api/employees/code/*/documents/*"
                )
                .hasRole("ADMIN")

                .requestMatchers(
                    HttpMethod.GET,
                    "/api/employees/**"
                )
                .authenticated()

                .requestMatchers(
                    "/api/employees/**"
                )
                .hasRole("ADMIN")

                // -------------------------------------------------
                // Attendance
                // -------------------------------------------------

                .requestMatchers(HttpMethod.GET, "/api/departments/**").authenticated()
                .requestMatchers("/api/departments/**").hasRole("ADMIN")

                .requestMatchers("/api/me/attendance/**")
                .hasRole("EMPLOYEE")

                .requestMatchers("/api/attendance/**")
                .hasAnyRole("ADMIN", "INPUTER")

                // -------------------------------------------------
                // Payroll
                // -------------------------------------------------

                .requestMatchers(
                    "/api/settings/payroll/**"
                )
                .hasRole("ADMIN")

                .requestMatchers(
                    "/api/payroll/**"
                )
                .hasRole("ADMIN")

                // -------------------------------------------------
                // System settings
                // -------------------------------------------------

                .requestMatchers(
                    "/api/settings/system/**"
                )
                .hasRole("ADMIN")

                // -------------------------------------------------
                // Supervisor APIs
                // -------------------------------------------------

                .requestMatchers(
                    "/api/supervisor/**"
                )
                .hasAnyRole(
                    "ADMIN",
                    "INPUTER"
                )

                // -------------------------------------------------
                // Everything else
                // -------------------------------------------------

                .anyRequest()
                .authenticated()
            )

            .addFilterBefore(
                jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }
}