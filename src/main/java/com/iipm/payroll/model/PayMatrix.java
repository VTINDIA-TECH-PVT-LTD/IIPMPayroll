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
@Document(collection = "pay_matrix")
public class PayMatrix {
    @Id
    private String id;

    // 7th CPC Pay Matrix
    // Pay Level: 1 to 18
    // Pay Index: 1 to 40 (incremental steps)

    private int payLevel;
    private int payIndex;

    // Pay band (min-max)
    private double payBand;
    private double gradePay;

    // Basic pay for this level and index
    private double basicPay;

    // CTC (Cost to Company) for reference
    private double ctc;

    // Designation range for this level
    private String designationRange;

    // Effective date
    private LocalDateTime effectiveFrom;
    private LocalDateTime effectiveTo;
    private boolean isActive;

    // Audit trail
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Notes
    private String notes;
}
