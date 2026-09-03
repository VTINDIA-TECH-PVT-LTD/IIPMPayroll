package com.iipm.payroll.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserDTO {
    private String id;

    @NotBlank(message = "Username is required")
    private String username;

    private String password;

    @NotBlank(message = "Employee ID is required")
    private String employeeId;

    @NotBlank(message = "First name is required")
    private String firstName;

    private String lastName;

    @Email(message = "Email should be valid")
    private String email;

    private String phone;
    
    private String profilePicture;

    private String designation;

    private String department;

    private String payLevel;

    private Integer payIndex;

    private Double basicPay;

    private String bankAccountNumber;

    private String ifscCode;

    private String bankName;

    private String pan;

    private String aadhar;

    private String employeeType;
    private String function;
    private String location;
    private String taxRegime;
    private String pfAccountNumber;
    private String pranAccountNumber;

    // Allowances & Deductions
    private Double deanAllowance;
    private Double specialAllowance;
    private Double otherDeductions;
    private Double taOverride;
    private Double cghsOverride;
    private Double tds;

    private String role;

    @com.fasterxml.jackson.annotation.JsonProperty("isActive")
    private boolean isActive;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private LocalDateTime lastLoginAt;
}
