package com.iipm.payroll.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "settings")
public class Setting {
    @Id
    private String id;

    // Setting key: DA_PERCENTAGE, HRA_PERCENTAGE, etc.
    private String key;
    private String value;
    private String dataType; // STRING, DOUBLE, INTEGER, BOOLEAN
    private String category; // PAYROLL, COMPANY, EMAIL, SYSTEM
    private String description;

    // Status and dates
    private boolean isActive;
    private LocalDateTime effectiveFrom;
    private LocalDateTime effectiveTo;

    // Audit trail
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;

    // Default values for payroll settings
    // Key examples: DA_PERCENTAGE, HRA_PERCENTAGE, NPS_EMPLOYEE_PERCENTAGE,
    // NPS_EMPLOYER_PERCENTAGE, PT_AMOUNT, CGHS_AMOUNT, TA_FIXED_AMOUNT, TA_DA_PERCENTAGE
}
