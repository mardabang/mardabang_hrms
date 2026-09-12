package com.mardabang.hrms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class MardaHrmsBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(MardaHrmsBackendApplication.class, args);
    }
}