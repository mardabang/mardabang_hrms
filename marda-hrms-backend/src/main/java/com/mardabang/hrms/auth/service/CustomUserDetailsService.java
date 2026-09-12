package com.mardabang.hrms.auth.service;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
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
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        com.mardabang.hrms.user.entity.User user = userService.getUserByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        return User.builder()
                .username(user.getEmail())
                .password(user.getPassword())
                .authorities(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
                .disabled(!Boolean.TRUE.equals(user.getActive()))
                .build();
    }
}
