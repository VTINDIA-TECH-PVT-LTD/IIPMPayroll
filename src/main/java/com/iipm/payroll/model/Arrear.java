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
@Document(collection = "arrears")
public class Arrear {
    @Id
    private String id;
    private String userId;
    private String employeeId;

    // Arrear type: DA, TA, PROMOTION, INCREMENT
    private String arrearType;

    // Period
    private int fromMonth;
    private int fromYear;
    private int toMonth;
    private int toYear;

    // Amounts
    private double grossAmount;
    private double tds;
    private double npsEmployeeShare;
    private double professionalTax;
    private double cghs;
    private double otherDeductions;
    private double totalDeductions;
    private double netAmount;

    // Status: DRAFT, SUBMITTED, APPROVED, REJECTED, PAID
    private String status;

    // Additional details for promotion arrears
    private double oldBasicPay;
    private double newBasicPay;
    private int daysWorked;
    private int totalDays;

    // Audit trail
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
    private String approvedBy;
    private LocalDateTime approvedAt;
    private LocalDateTime paidAt;
}
