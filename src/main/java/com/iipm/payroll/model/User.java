package com.iipm.payroll.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "users")
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String username;

    private String password;

    @Indexed(unique = true)
    private String employeeId;

    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String profilePicture;

    private UserRole role;

    // Employee Details
    private String designation;
    private String department;
    private String payLevel;
    private Integer payIndex;
    private Double basicPay;
    private String employeeType;
    
    // Additional official fields
    private String function;
    private String location;
    private String taxRegime;
    private String pfAccountNumber;
    private String pranAccountNumber;

    // Bank Details
    private String bankAccountNumber;
    private String ifscCode;
    private String bankName;

    // Personal Details
    private String pan;
    private String aadhar;
    private LocalDateTime dateOfJoining;

    // Account Status
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastLoginAt;

    // Audit
    private String createdBy;
    private String updatedBy;

    // Roles
    private Set<String> roles;

    private String profilePhotoUrl;
}
