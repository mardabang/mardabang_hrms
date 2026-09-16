package com.mardabang.hrms.leave.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;
import java.time.Instant;

@Entity
@Table(name = "employee_leave_requests", indexes = {
    @Index(name = "idx_leave_firm", columnList = "firm_id"),
    @Index(name = "idx_leave_owner", columnList = "owner_id")
})
@Getter @Setter
public class LeaveRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Version private Long version;
    @Column(name = "owner_id", nullable = false) private Long ownerId;
    @Column(name = "employee_id") private Long employeeId;
    @Column(name = "firm_id", nullable = false) private Long firmId;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", insertable = false, updatable = false)
    private com.mardabang.hrms.user.entity.User owner;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", insertable = false, updatable = false)
    private com.mardabang.hrms.employee.entity.Employee employee;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "firm_id", insertable = false, updatable = false)
    private com.mardabang.hrms.firms.entity.Firm firm;
    @Column(nullable = false) private String firmCode;
    private String employeeCode;
    @Column(nullable = false) private String employeeName;
    @Column(nullable = false) private String ownerRole;
    @Column(nullable = false) private String type;
    @Column(nullable = false) private LocalDate fromDate;
    @Column(nullable = false) private LocalDate toDate;
    @Column(nullable = false) private int days;
    @Column(nullable = false, length = 1000) private String reason;
    @Column(nullable = false) private String status;
    @Column(nullable = false) private Instant submittedAt;
    private Long reviewerId;
    private String reviewerName;
    private String reviewerRole;
    private Instant reviewedAt;
    @Column(length = 1000) private String reviewNote;
    private Instant cancelledAt;
}
