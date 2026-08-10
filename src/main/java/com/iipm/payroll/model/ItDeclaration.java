package com.iipm.payroll.model;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "it_declarations")
public class ItDeclaration {
    @Id
    private String id;
    private String userId;
    private String financialYear;
    
    private double section80C;
    private double section80D;
    private double hraExemption;
    private double homeLoanInterest;
    
    private String status; // PENDING/APPROVED/REJECTED
    
    private String taxRegime; // OLD or NEW
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
