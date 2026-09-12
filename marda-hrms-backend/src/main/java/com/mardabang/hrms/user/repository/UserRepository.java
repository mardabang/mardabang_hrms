package com.mardabang.hrms.user.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mardabang.hrms.user.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByMobile(String mobile);

    Optional<User> findByEmployeeCode(String employeeCode);

    boolean existsByEmail(String email);

    boolean existsByMobile(String mobile);

    boolean existsByEmployeeCode(String employeeCode);
}
