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
@Document(collection = "notifications")
public class Notification {
    @Id
    private String id;
    private String userId;

    // Notification type
    private String type; // PAYROLL_READY, APPROVAL_NEEDED, PAYSLIP_GENERATED,
                         // SETTINGS_CHANGED, ARREAR_PROCESSED, SYSTEM_ALERT

    // Notification content
    private String title;
    private String message;
    private String actionUrl;
    private String priority; // LOW, MEDIUM, HIGH

    // Status
    private boolean isRead;
    private LocalDateTime readAt;

    // Metadata
    private String relatedEntityId;
    private String relatedEntityType;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
}
