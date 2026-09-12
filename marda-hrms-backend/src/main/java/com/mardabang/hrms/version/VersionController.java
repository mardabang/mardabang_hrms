package com.mardabang.hrms.version;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

@RestController
public class VersionController {

    @Value("${app.version}")
    private String version;

    @GetMapping("/api/version")
    public String version() {
        return version;
    }
}