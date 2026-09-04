package com.iipm.payroll.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "payrolls")
public class Payroll {
    @Id
    private String id;
    private String userId;
    private String employeeId;
    private int month;
    private int year;

    // Earnings
    private double basicPay;
    private double da;
    private double hra;
    private double ta;
    private double npsEmployerShare;
    private double otherAllowances;
    private double daArrears;
    private double promotionArrears;
    private double arrears;
    private double grossSalary;

    // Deductions
    private double tds;
    private double professionalTax;
    private double npsEmployeeShare;
    private double cghs;
    private double otherDeductions;
    private double totalDeductions;

    // Final Amount
    private Double netSalary;

    // Status tracking
    private String status; // DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, LOCKED
    
    private String remark;
    private List<String> attachments = new ArrayList<>();

    private String rejectReason;
    private String approvedBy;
    private LocalDateTime approvedAt;
    private String rejectionReason;

    // Audit trail
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
}
