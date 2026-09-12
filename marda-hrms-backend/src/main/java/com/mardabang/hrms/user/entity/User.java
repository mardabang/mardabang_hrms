package com.mardabang.hrms.user.entity;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.*;
import lombok.*;

import com.mardabang.hrms.firms.entity.Firm;   // adjust package if different

@Entity
@Table(name = "app_users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String fullName;
    @Column(unique = true)
    private String email;
    @Column(unique = true)
    private String mobile;
    @Column(name = "employee_code", unique = true)
    private String employeeCode;
    @Column
    private String password;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;
    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_firms",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "firm_id")
    )
    @Builder.Default
    private Set<Firm> firms = new HashSet<>();
}