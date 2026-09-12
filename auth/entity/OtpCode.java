package com.mardabang.hrms.auth.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "otp_codes", indexes = {
    @Index(name = "idx_otp_mobile", columnList = "mobile")
})
@Getter @Setter
public class OtpCode {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String mobile;

    @Column(nullable = false)
    private String codeHash;

    @Column(nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private int attempts;

    @Column(nullable = false)
    private boolean used;

    @Column(nullable = false)
    private Instant createdAt;
}
