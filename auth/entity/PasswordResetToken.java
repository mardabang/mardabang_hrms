package com.mardabang.hrms.auth.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "password_reset_tokens", indexes = {
    @Index(name = "idx_reset_token_hash", columnList = "tokenHash")
})
@Getter @Setter
public class PasswordResetToken {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    // SHA-256 hash of the raw token; only the raw token is ever emailed, never stored.
    @Column(nullable = false, unique = true)
    private String tokenHash;

    @Column(nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private boolean used;

    @Column(nullable = false)
    private Instant createdAt;
}
