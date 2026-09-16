package com.mardabang.hrms.employee.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeDto {
    private Long id;
    private String employeeCode;
    private String name;
    private String department;
    private Long departmentId;
    public Long getDepartmentId() {return departmentId;}
    public void setDepartmentId(Long value) {departmentId=value;}
    private String designation;
    private String firstName;
    private String lastName;
    private String contact;
    private String email;
    private String gender;
    private LocalDate dateOfBirth;
    private String employmentType;
    private String address;
    private LocalDate joiningDate;
    private String wageType;
    private BigDecimal monthlySalary;
    private String paymentMode;
    private Integer shiftLength;
    private Integer otStartsAfter;
    private BigDecimal otRate;
    private String accountNumber;
    private String ifscCode;
    private String bankName;
    private String pfAccountNumber;
    private String esiAccountNumber;
    private String aadharNumber;
    private String panNumber;
    private String profilePhotoName;
    private String profilePhotoKey;
    private Boolean hasProfilePhoto;
    private Boolean hasAadharDocument;
    private Boolean hasPanDocument;
    private String statutorySchemes;
    private Boolean active;
    private String status;
    private Long firmId;
    private String firmCode;
    private String firmName;
    public String getFirmCode() { return firmCode; }
    public void setFirmCode(String value) { firmCode=value; }
    public String getFirmName() { return firmName; }
    public void setFirmName(String value) { firmName=value; }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmployeeCode() {
        return employeeCode;
    }

    public void setEmployeeCode(String employeeCode) {
        this.employeeCode = employeeCode;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getDesignation() {
        return designation;
    }

    public void setDesignation(String designation) {
        this.designation = designation;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getContact() {
        return contact;
    }

    public void setContact(String contact) {
        this.contact = contact;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public String getEmploymentType() {
        return employmentType;
    }

    public void setEmploymentType(String employmentType) {
        this.employmentType = employmentType;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public LocalDate getJoiningDate() {
        return joiningDate;
    }

    public void setJoiningDate(LocalDate joiningDate) {
        this.joiningDate = joiningDate;
    }

    public String getWageType() {
        return wageType;
    }

    public void setWageType(String wageType) {
        this.wageType = wageType;
    }

    public BigDecimal getMonthlySalary() {
        return monthlySalary;
    }

    public void setMonthlySalary(BigDecimal monthlySalary) {
        this.monthlySalary = monthlySalary;
    }

    public String getPaymentMode() {
        return paymentMode;
    }

    public void setPaymentMode(String paymentMode) {
        this.paymentMode = paymentMode;
    }

    public Integer getShiftLength() { return shiftLength; }
    public void setShiftLength(Integer shiftLength) { this.shiftLength = shiftLength; }
    public Integer getOtStartsAfter() { return otStartsAfter; }
    public void setOtStartsAfter(Integer otStartsAfter) { this.otStartsAfter = otStartsAfter; }
    public BigDecimal getOtRate() { return otRate; }
    public void setOtRate(BigDecimal otRate) { this.otRate = otRate; }
    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }
    public String getIfscCode() { return ifscCode; }
    public void setIfscCode(String ifscCode) { this.ifscCode = ifscCode; }
    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }
    public String getPfAccountNumber() { return pfAccountNumber; }
    public void setPfAccountNumber(String pfAccountNumber) { this.pfAccountNumber = pfAccountNumber; }
    public String getEsiAccountNumber() { return esiAccountNumber; }
    public void setEsiAccountNumber(String esiAccountNumber) { this.esiAccountNumber = esiAccountNumber; }
    public String getAadharNumber() { return aadharNumber; }
    public void setAadharNumber(String aadharNumber) { this.aadharNumber = aadharNumber; }
    public String getPanNumber() { return panNumber; }
    public void setPanNumber(String panNumber) { this.panNumber = panNumber; }
    public String getProfilePhotoName() { return profilePhotoName; }
    public void setProfilePhotoName(String profilePhotoName) { this.profilePhotoName = profilePhotoName; }
    public String getProfilePhotoKey() { return profilePhotoKey; }
    public void setProfilePhotoKey(String profilePhotoKey) { this.profilePhotoKey = profilePhotoKey; }
    public Boolean getHasProfilePhoto() { return hasProfilePhoto; }
    public void setHasProfilePhoto(Boolean hasProfilePhoto) { this.hasProfilePhoto = hasProfilePhoto; }
    public Boolean getHasAadharDocument() { return hasAadharDocument; }
    public void setHasAadharDocument(Boolean hasAadharDocument) { this.hasAadharDocument = hasAadharDocument; }
    public Boolean getHasPanDocument() { return hasPanDocument; }
    public void setHasPanDocument(Boolean hasPanDocument) { this.hasPanDocument = hasPanDocument; }
    public String getStatutorySchemes() { return statutorySchemes; }
    public void setStatutorySchemes(String statutorySchemes) { this.statutorySchemes = statutorySchemes; }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

	public Long getFirmId() {
		return firmId;
	}

	public void setFirmId(Long firmId) {
		this.firmId = firmId;
	}
}
