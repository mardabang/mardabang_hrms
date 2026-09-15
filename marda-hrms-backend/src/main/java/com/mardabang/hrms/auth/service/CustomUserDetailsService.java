package com.mardabang.hrms.auth.service;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.mardabang.hrms.user.service.UserService;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserService userService;

    public CustomUserDetailsService(UserService userService) {
        this.userService = userService;
    }

    @Override
    public UserDetails loadUserByUsername(String username)
            throws UsernameNotFoundException {

        var user = userService.getUserByLoginId(username)
                .orElseGet(() ->
                    userService.getUserByEmail(username)
                        .orElseThrow(() ->
                            new UsernameNotFoundException(
                                "User not found: " + username
                            )
                        )
                );

        return org.springframework.security.core.userdetails.User
                .builder()
                .username(user.getLoginId() == null || user.getLoginId().isBlank() ? user.getEmail() : user.getLoginId())
                .password(user.getPassword())
                .authorities(
                    new SimpleGrantedAuthority(
                        "ROLE_" + user.getRole().name()
                    )
                )
                .disabled(!Boolean.TRUE.equals(user.getActive()))
                .build();
    }
}