package com.iipm.payroll.dto;

import lombok.Data;
import java.util.Map;

@Data
public class BulkPayrollRequest {
    private String department;
    private String payLevel;
    private int month;
    private int year;
    private Map<String, Double> tdsMap; // Key: userId, Value: TDS amount
    private Map<String, String> remarksMap; // Key: userId, Value: Remark
}
