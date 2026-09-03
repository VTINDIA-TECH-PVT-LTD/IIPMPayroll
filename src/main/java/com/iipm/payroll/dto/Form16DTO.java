package com.iipm.payroll.dto;

import lombok.Data;
import java.util.List;

@Data
public class Form16DTO {
    // Part A: Employer Details
    private String employerName;
    private String employerAddress;
    private String employerPAN;
    private String employerTAN;

    // Part A: Employee Details
    private String employeeName;
    private String employeePAN;
    private String employeeId;
    private String employeeAddress;

    private String assessmentYear;
    private String financialYear;

    // Part A: Quarter-wise TDS summary
    private List<QuarterlyTds> quarterlyTdsList;
    private List<ChallanDetail> challanDetails;
    private double totalTdsDeposited;

    // Part B: Salary Details
    private double grossSalary;
    private double allowancesExemptUpto10; // HRA
    private double balance; // gross - exempt
    private double standardDeduction;
    private double professionalTax;
    private double incomeChargeableUnderSalaries; // balance - std - pt

    private double anyOtherIncome;
    private double grossTotalIncome;

    // Chapter VI-A deductions
    private double deduction80C;
    private double deduction80D;
    private double deduction80CCD;
    private double deduction80CCD1B;
    private double deduction80CCD2;
    private double homeLoanInterest;
    private double totalChapterVIADeductions;

    private double totalTaxableIncome;
    private double taxOnTotalIncome;
    private double rebate87A;
    private double surcharge;
    private double healthAndEducationCess;
    private double totalTaxPayable;

    private double taxDeductedAtSource;
    private double taxPayableOrRefundable;

    @Data
    public static class QuarterlyTds {
        private String quarter;
        private String receiptNumber;
        private double amountPaid;
        private double taxDeducted;
        private double taxDeposited;

        public QuarterlyTds(String quarter, String receiptNumber, double amountPaid, double taxDeducted, double taxDeposited) {
            this.quarter = quarter;
            this.receiptNumber = receiptNumber;
            this.amountPaid = amountPaid;
            this.taxDeducted = taxDeducted;
            this.taxDeposited = taxDeposited;
        }
    }

    @Data
    public static class ChallanDetail {
        private String bsrCode;
        private String dateOfDeposit;
        private String challanSerialNumber;
        private double amount;

        public ChallanDetail(String bsrCode, String dateOfDeposit, String challanSerialNumber, double amount) {
            this.bsrCode = bsrCode;
            this.dateOfDeposit = dateOfDeposit;
            this.challanSerialNumber = challanSerialNumber;
            this.amount = amount;
        }
    }
}
