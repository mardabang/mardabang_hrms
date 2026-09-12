package com.mardabang.hrms.employee.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeSelfUpdateRequest {
    private String contact;
    private String address;
    private String accountNumber;
    private String ifscCode;
    private String bankName;

    public String getContact() { return contact; }
    public void setContact(String contact) { this.contact = contact; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }
    public String getIfscCode() { return ifscCode; }
    public void setIfscCode(String ifscCode) { this.ifscCode = ifscCode; }
    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }
}