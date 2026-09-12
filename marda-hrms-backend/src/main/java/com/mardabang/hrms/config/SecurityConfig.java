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

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/error").permitAll()
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers("/api/auth/otp/request").permitAll()
                .requestMatchers("/api/auth/otp/verify").permitAll()
                .requestMatchers("/api/auth/forgot-password").permitAll()
                .requestMatchers("/api/auth/reset-password").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/register").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/employees/code/*/documents/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/employees/**").authenticated()
                .requestMatchers("/api/employees/**").hasRole("ADMIN")
                .requestMatchers("/api/attendance/**").authenticated()
                .requestMatchers("/api/settings/payroll/**").hasRole("ADMIN")
                .requestMatchers("/api/payroll/**").hasRole("ADMIN")
                .requestMatchers("/api/settings/system/**").hasRole("ADMIN")
                .requestMatchers("/api/supervisor/**").hasAnyRole("ADMIN", "INPUTER")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}