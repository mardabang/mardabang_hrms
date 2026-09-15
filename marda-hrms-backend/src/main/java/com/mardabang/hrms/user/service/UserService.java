package com.mardabang.hrms.user.service;

import java.util.List;
import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.mardabang.hrms.user.entity.User;
import com.mardabang.hrms.user.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User saveUser(User user) {

        /*
         * Encode only when a raw password is supplied.
         *
         * This prevents accidentally encoding an already encoded password
         * when saving an existing user.
         */
        if (user.getPassword() != null
                && !user.getPassword().isBlank()) {

            user.setPassword(
                    passwordEncoder.encode(user.getPassword())
            );
        }

        return userRepository.save(user);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    public Optional<User> getUserByPrincipal(String principal) {
        return userRepository.findByLoginId(principal)
                .or(() -> userRepository.findByEmail(principal));
    }

    public Optional<User> getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public Optional<User> getUserByMobile(String mobile) {
        return userRepository.findByMobile(mobile);
    }

    public Optional<User> getUserByLoginId(String loginId) {
        return userRepository.findByLoginId(loginId);
    }

    public Optional<User> getUserByEmployeeCode(String employeeCode) {
        return userRepository.findByEmployeeCode(employeeCode);
    }

    public boolean emailExists(String email) {
        return userRepository.existsByEmail(email);
    }

    public boolean mobileExists(String mobile) {
        return userRepository.existsByMobile(mobile);
    }

    public boolean loginIdExists(String loginId) {
        return userRepository.existsByLoginId(loginId);
    }

    public boolean employeeCodeExists(String employeeCode) {
        return userRepository.existsByEmployeeCode(employeeCode);
    }
}