package com.mardabang.hrms.leave;

import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/leaves")
public class LeaveController {
    private final LeaveService service;
    private final LeavePolicy policy;
    public LeaveController(LeaveService service, LeavePolicy policy) { this.service = service; this.policy = policy; }
    public record Application(String firmCode, String type, LocalDate from, LocalDate to, String reason) {}
    public record Decision(String status, String note) {}
    @GetMapping
    public Object list(Authentication auth, @RequestParam(required = false) String firmCode, @RequestParam(defaultValue = "false") boolean mine) {
        return service.list(auth.getName(), firmCode, mine);
    }
    @PostMapping
    public Object submit(Authentication auth, @RequestBody Application form) {
        return service.submit(auth.getName(), form.firmCode(), form.type(), form.from(), form.to(), form.reason());
    }
    @PutMapping("/{id}/review")
    public Object review(Authentication auth, @PathVariable Long id, @RequestBody Decision form) {
        return service.review(auth.getName(), id, form.status(), form.note());
    }
    @PutMapping("/{id}/cancel")
    public Object cancel(Authentication auth, @PathVariable Long id) { return service.cancel(auth.getName(), id); }
    @GetMapping("/policy")
    public Object policy() {
        return Map.of("supervisorMaxDays", policy.supervisorLimit, "weeklyOffDays", policy.weeklyOffDays,
            "holidays", policy.holidays, "today", LocalDate.now(policy.zone));
    }
    @GetMapping("/days")
    public Object days(@RequestParam LocalDate from, @RequestParam LocalDate to) { return Map.of("days", policy.days(from, to)); }
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> failure(ResponseStatusException ex) { return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", ex.getReason())); }
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> invalid(IllegalArgumentException ex) { return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage())); }
}
