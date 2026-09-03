package com.iipm.payroll.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TdsProjectionDTO {
    private String userId;
    private String employeeId;
    private String employeeName;
    private String designation;
    private String department;
    private String pan;
    private String financialYear;
    private String taxRegime;

    // Income & Exemptions
    private double projectedAnnualGross;
    private double standardDeduction;
    private double deduction80CCD2;
    private double professionalTax;
    private double otherChapterVIADeductions;
    private double totalDeductions;
    private double netTaxableIncome;

    // Tax Computation
    private double taxOnIncome;
    private double rebate87A;
    private double cess;
    private double estimatedAnnualTax;

    // TDS Tracking
    private double tdsDeductedSoFar;
    private double tdsRemainingToBeDeducted;
    private int monthsDeductedCount;
    private int monthsRemainingCount;
    private double monthlyTdsNextMonths;

    // 12-Month Schedule
    private List<MonthlyTdsItem> monthlySchedule;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyTdsItem {
        private int month;
        private int year;
        private String monthName;
        private double grossSalary;
        private double tdsAmount;
        private String status; // "DEDUCTED", "PROJECTED"
        private double cumulativeTds;
    }
}
