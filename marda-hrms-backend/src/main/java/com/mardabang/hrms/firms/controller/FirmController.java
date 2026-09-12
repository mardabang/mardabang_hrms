package com.mardabang.hrms.firms.controller;

import com.mardabang.hrms.firms.entity.Firm;
import com.mardabang.hrms.firms.service.FirmService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/firms")
@CrossOrigin(origins = "http://localhost:5173")
public class FirmController {

    private final FirmService service;

    public FirmController(FirmService service) {
        this.service = service;
    }

    @GetMapping
    public List<Firm> getAllFirms() {
        return service.getAllFirms();
    }

    @GetMapping("/{id}")
    public Firm getFirm(@PathVariable Long id) {
        return service.getFirmById(id);
    }

    @PostMapping
    public Firm createFirm(@RequestBody Firm firm) {
        return service.createFirm(firm);
    }

    @PutMapping("/{id}")
    public Firm updateFirm(@PathVariable Long id, @RequestBody Firm firm) {
        return service.updateFirm(id, firm);
    }

    @DeleteMapping("/{id}")
    public void deleteFirm(@PathVariable Long id) {
        service.deleteFirm(id);
    }
}