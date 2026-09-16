package com.mardabang.hrms.department;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import com.mardabang.hrms.firms.entity.Firm;
@Entity @Getter @Setter
@Table(name="departments", uniqueConstraints=@UniqueConstraint(columnNames={"firm_id","name_key"}))
public class Department {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional=false) @JoinColumn(name="firm_id",nullable=false) private Firm firm;
    @Column(nullable=false,length=100) private String name;
    @Column(name="name_key",nullable=false,length=100) private String nameKey;
    @Column(nullable=false) private boolean active=true;
    @Column(nullable=false,updatable=false) private Instant createdAt=Instant.now();
    @Column(nullable=false) private Instant updatedAt=Instant.now();
    @PreUpdate void updated() { updatedAt=Instant.now(); }
}
