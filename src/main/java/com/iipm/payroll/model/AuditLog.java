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
@Document(collection = "audit_logs")
public class AuditLog {
    @Id
    private String id;

    // User who performed the action
    private String userId;
    private String username;

    // Action details
    private String action; // CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, APPROVE, REJECT
    private String entityType; // USER, PAYROLL, ARREAR, SETTING
    private String entityId;

    // What changed
    private String details; // JSON format of changes
    private String oldValue;
    private String newValue;

    // Request context
    private String ipAddress;
    private String userAgent;

    // Status
    private String status; // SUCCESS, FAILURE
    private String errorMessage;

    // Timestamp
    private LocalDateTime timestamp;
}
