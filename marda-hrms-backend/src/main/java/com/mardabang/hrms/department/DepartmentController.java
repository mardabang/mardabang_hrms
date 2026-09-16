package com.mardabang.hrms.department;
import java.util.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.dao.DataIntegrityViolationException;
import lombok.RequiredArgsConstructor;
@RestController @RequestMapping("/api/departments") @RequiredArgsConstructor
public class DepartmentController {
    private final DepartmentService service;
    public record Form(Long firmId,String name,Boolean active) {}
    @GetMapping public Object list(@RequestParam Long firmId,@RequestParam(defaultValue="true") boolean activeOnly,Authentication auth) {return service.list(firmId,activeOnly,auth.getName());}
    @PostMapping public ResponseEntity<?> create(@RequestBody Form form,Authentication auth) {return ResponseEntity.status(HttpStatus.CREATED).body(service.create(form.firmId(),form.name(),auth.getName()));}
    @PutMapping("/{id}") public Object update(@PathVariable Long id,@RequestBody Form form,Authentication auth) {return service.update(id,form.name(),form.active(),auth.getName());}
    @DeleteMapping("/{id}") public Object deactivate(@PathVariable Long id,Authentication auth) {return service.update(id,null,false,auth.getName());}
    @ExceptionHandler(ResponseStatusException.class) ResponseEntity<?> failure(ResponseStatusException e) {return ResponseEntity.status(e.getStatusCode()).body(Map.of("message",e.getReason()));}
    @ExceptionHandler(IllegalArgumentException.class) ResponseEntity<?> invalid(IllegalArgumentException e) {return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));}
    @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<?> conflict() {return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message","Department already exists or is still referenced."));}
}
