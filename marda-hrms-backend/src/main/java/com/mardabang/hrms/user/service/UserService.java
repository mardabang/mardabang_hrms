package com.mardabang.hrms.user.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.mardabang.hrms.user.entity.User;
import com.mardabang.hrms.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;

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
	    user.setPassword(passwordEncoder.encode(user.getPassword()));
	    return userRepository.save(user);
	}

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public Optional<User> getUserByMobile(String mobile) {
        return userRepository.findByMobile(mobile);
    }
    
    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    public boolean emailExists(String email) {
        return userRepository.existsByEmail(email);
    }

    public boolean mobileExists(String mobile) {
        return userRepository.existsByMobile(mobile);
    }

    public boolean employeeCodeExists(String employeeCode) {
        return userRepository.existsByEmployeeCode(employeeCode);
    }
}
