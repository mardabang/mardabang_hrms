package com.mardabang.hrms.leave;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface LeaveRepository extends JpaRepository<LeaveRequest, Long> {
    List<LeaveRequest> findByFirmIdOrderBySubmittedAtDesc(Long firmId);
    List<LeaveRequest> findByOwnerIdOrderBySubmittedAtDesc(Long ownerId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from LeaveRequest r where r.id = :id")
    Optional<LeaveRequest> lockById(@Param("id") Long id);
    @Query("select count(r) > 0 from LeaveRequest r where r.ownerId = :owner " +
        "and r.status in ('Pending', 'Approved') and r.fromDate <= :end and r.toDate >= :start")
    boolean overlaps(@Param("owner") Long owner, @Param("start") LocalDate start, @Param("end") LocalDate end);
}
