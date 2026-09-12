package com.mardabang.hrms.payroll.dto;

import java.time.LocalDate;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PaymentRequest {

    private String paymentMode;

    private LocalDate paymentDate;

    private String transactionReference;
}