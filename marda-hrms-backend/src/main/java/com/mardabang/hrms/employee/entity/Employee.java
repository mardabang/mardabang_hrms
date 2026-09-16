package com.mardabang.hrms.employee.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "employees",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = "employee_code")
    }
)
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "firm_id", nullable = false)
    private Long firmId;

    @Column(name = "employee_code", nullable = false, unique = true)
    private String employeeCode;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String department;
    @jakarta.persistence.ManyToOne
    @jakarta.persistence.JoinColumn(
        name="department_id",
        columnDefinition="BIGINT UNSIGNED",
        foreignKey=@jakarta.persistence.ForeignKey(value=jakarta.persistence.ConstraintMode.NO_CONSTRAINT)
    )
    private com.mardabang.hrms.department.Department departmentRecord;
    public com.mardabang.hrms.department.Department getDepartmentRecord() {return departmentRecord;}
    public void setDepartmentRecord(com.mardabang.hrms.department.Department value) {departmentRecord=value;}

    @Column
    private String designation;

    @Column
    private String firstName;

    @Column
    private String lastName;

    @Column
    private String contact;

    @Column
    private String email;

    @Column
    private String gender;

    @Column
    private LocalDate dateOfBirth;

    @Column
    private String employmentType;

    @Column
    private String address;

    @Column
    private LocalDate joiningDate;

    @Column
    private String wageType;

    @Column(precision = 12, scale = 2)
    private BigDecimal monthlySalary;

    @Column
    private String paymentMode;

    @Column
    private Integer shiftLength;

    @Column
    private Integer otStartsAfter;

    @Column(precision = 12, scale = 2)
    private BigDecimal otRate;

    @Column
    private String accountNumber;

    @Column
    private String ifscCode;

    @Column
    private String bankName;

    @Column
    private String pfAccountNumber;

    @Column
    private String esiAccountNumber;

    @Column
    private String aadharNumber;

    @Column
    private String panNumber;

    @Column
    private String profilePhotoName;

    @Column
    private String profilePhotoKey;

    @Column
    private String aadharDocumentName;

    @Column
    private String aadharDocumentKey;

    @Column
    private String panDocumentName;

    @Column
    private String panDocumentKey;

    @Column
    private String statutorySchemes;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(nullable = false)
    @Builder.Default
    private String status = "Active";
    
    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    public Long getCreatedByUserId() { return createdByUserId; }
    public void setCreatedByUserId(Long createdByUserId) { this.createdByUserId = createdByUserId; }

    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public Long getFirmId() { 
    	return firmId; 
    }
    
    public void setFirmId(Long firmId) { 
    	this.firmId = firmId; 
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
    public String getAadharDocumentName() { return aadharDocumentName; }
    public void setAadharDocumentName(String aadharDocumentName) { this.aadharDocumentName = aadharDocumentName; }
    public String getAadharDocumentKey() { return aadharDocumentKey; }
    public void setAadharDocumentKey(String aadharDocumentKey) { this.aadharDocumentKey = aadharDocumentKey; }
    public String getPanDocumentName() { return panDocumentName; }
    public void setPanDocumentName(String panDocumentName) { this.panDocumentName = panDocumentName; }
    public String getPanDocumentKey() { return panDocumentKey; }
    public void setPanDocumentKey(String panDocumentKey) { this.panDocumentKey = panDocumentKey; }
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
}
