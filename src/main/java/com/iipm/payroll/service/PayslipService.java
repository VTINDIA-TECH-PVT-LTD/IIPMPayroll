package com.iipm.payroll.service;

import com.iipm.payroll.model.Payroll;
import com.iipm.payroll.model.User;
import com.iipm.payroll.repository.PayrollRepository;
import com.iipm.payroll.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
public class PayslipService {

    @Autowired
    private PayrollRepository payrollRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    public Map<String, Object> generatePayslip(String payrollId) {
        Payroll payroll = payrollRepository.findById(payrollId)
                .orElseThrow(() -> new RuntimeException("Payroll not found"));

        User user = userRepository.findById(payroll.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!"APPROVED".equalsIgnoreCase(payroll.getStatus())) {
            throw new RuntimeException("Only approved payroll can be used for payslip generation");
        }

        Map<String, Object> payslipData = generatePayslipData(payroll, user);

        log.info("Payslip generated for employee {}", user.getEmployeeId());

        // Notify employee
        notificationService.createNotification(payroll.getUserId(), "PAYSLIP_GENERATED",
                "Payslip Generated",
                "Your payslip for " + getMonthName(payroll.getMonth()) + " " + payroll.getYear() + " is ready for download",
                "HIGH");

        return payslipData;
    }

    public Map<String, Object> generatePayslipData(Payroll payroll, User user) {
        java.util.Map<String, Object> payslipData = new java.util.HashMap<>();

        // Company details
        payslipData.put("companyName", "Indian Institute of Petroleum & Energy");
        payslipData.put("companyAddress", "Visakhapatnam, India");
        payslipData.put("companyLogo", "logo.png");

        // Employee details
        if (user != null) {
            payslipData.put("employeeName", user.getFirstName() + " " + user.getLastName());
            payslipData.put("employeeId", user.getEmployeeId());
            payslipData.put("designation", user.getDesignation());
            payslipData.put("department", user.getDepartment());
            payslipData.put("panNumber", user.getPan());
            payslipData.put("pan", user.getPan());
            payslipData.put("aadharNumber", user.getAadhar());
            payslipData.put("pran", (user.getPranAccountNumber() != null && !user.getPranAccountNumber().isEmpty()) 
                    ? user.getPranAccountNumber() 
                    : (user.getPfAccountNumber() != null ? user.getPfAccountNumber() : "-"));
            payslipData.put("payLevel", user.getPayLevel() != null ? user.getPayLevel() : "10");
            payslipData.put("taxRegime", user.getTaxRegime() != null ? user.getTaxRegime() : "Regular Tax Regime");
            payslipData.put("bankAccount", user.getBankAccountNumber() != null ? maskAccountNumber(user.getBankAccountNumber()) : "-");
            payslipData.put("dateOfJoining", user.getDateOfJoining() != null ? user.getDateOfJoining() : "-");
            payslipData.put("bankName", user.getBankName());
            payslipData.put("bankAccountNumber", maskAccountNumber(user.getBankAccountNumber()));
            payslipData.put("ifscCode", user.getIfscCode());
        } else {
            payslipData.put("employeeName", payroll.getUserId());
            payslipData.put("employeeId", payroll.getUserId());
            payslipData.put("designation", "-");
            payslipData.put("department", "-");
            payslipData.put("panNumber", "-");
            payslipData.put("pan", "-");
            payslipData.put("pran", "-");
            payslipData.put("payLevel", "10");
            payslipData.put("taxRegime", "New Tax Regime");
            payslipData.put("bankAccount", "-");
            payslipData.put("dateOfJoining", "-");
        }
        payslipData.put("dateOfNextIncrement", "01-Jul-" + payroll.getYear());

        // Category (1: Regular - Teaching, 2: Regular - Non Teaching, 3: Contract)
        String empId = (user != null && user.getEmployeeId() != null) ? user.getEmployeeId().toUpperCase() : "";
        String empType = (user != null && user.getEmployeeType() != null) ? user.getEmployeeType().toUpperCase() : "";
        String fn = (user != null && user.getFunction() != null) ? user.getFunction().toUpperCase() : "";
        String desig = (user != null && user.getDesignation() != null) ? user.getDesignation().toUpperCase() : "";

        String category;
        if (empId.startsWith("CNT") || empId.startsWith("CT") || empId.startsWith("CMED") || empType.contains("CONTRACT") || fn.contains("CONTRACT") || desig.contains("CONTRACT")) {
            category = "Contract";
        } else if (empId.startsWith("TS")) {
            category = "Regular - Teaching";
        } else if (empId.startsWith("NT") || empId.startsWith("NTS") || empId.startsWith("DIR")) {
            category = "Regular - Non Teaching";
        } else if (desig.contains("PROFESSOR") || fn.contains("TEACHING")) {
            category = "Regular - Teaching";
        } else {
            category = "Regular - Non Teaching";
        }
        payslipData.put("category", category);

        // Payroll period
        YearMonth period = YearMonth.of(payroll.getYear(), payroll.getMonth());
        payslipData.put("payrollPeriod", period.toString());
        payslipData.put("month", getMonthName(payroll.getMonth()));
        payslipData.put("monthName", getMonthName(payroll.getMonth()));
        payslipData.put("year", payroll.getYear());
        int totalDays = payroll.getTotalDaysInMonth() != null && payroll.getTotalDaysInMonth() > 0 ? payroll.getTotalDaysInMonth() : period.lengthOfMonth();
        int payableDays = payroll.getPayableDays() != null && payroll.getPayableDays() > 0 ? payroll.getPayableDays() : totalDays;
        payslipData.put("payableDays", payableDays);
        payslipData.put("totalDaysInMonth", totalDays);

        // Earnings
        java.util.Map<String, Object> earnings = new java.util.HashMap<>();
        earnings.put("basicPay", payroll.getBasicPay());
        earnings.put("da", payroll.getDa());
        earnings.put("hra", payroll.getHra());
        earnings.put("ta", payroll.getTa());
        earnings.put("npsEmployerShare", payroll.getNpsEmployerShare());
        earnings.put("daArrears", payroll.getDaArrears());
        earnings.put("promotionArrears", payroll.getPromotionArrears());
        earnings.put("arrears", payroll.getArrears());
        earnings.put("otherAllowances", payroll.getOtherAllowances());
        earnings.put("ignorablePension", payroll.getIgnorablePension());
        earnings.put("grossSalary", payroll.getGrossSalary());
        payslipData.put("earnings", earnings);
        
        // Flatten earnings to top-level
        payslipData.put("basicPay", payroll.getBasicPay());
        payslipData.put("da", payroll.getDa());
        payslipData.put("hra", payroll.getHra());
        payslipData.put("ta", payroll.getTa());
        payslipData.put("npsEmployerShare", payroll.getNpsEmployerShare());
        payslipData.put("daArrears", payroll.getDaArrears());
        payslipData.put("promotionArrears", payroll.getPromotionArrears());
        payslipData.put("arrears", payroll.getArrears());
        payslipData.put("otherAllowances", payroll.getOtherAllowances());
        payslipData.put("ignorablePension", payroll.getIgnorablePension());
        payslipData.put("grossSalary", payroll.getGrossSalary());

        // Deductions
        java.util.Map<String, Object> deductions = new java.util.HashMap<>();
        deductions.put("professionalTax", payroll.getProfessionalTax());
        deductions.put("tds", payroll.getTds());
        deductions.put("npsEmployee", payroll.getNpsEmployeeShare());
        deductions.put("npsEmployeeShare", payroll.getNpsEmployeeShare());
        deductions.put("cghs", payroll.getCghs());
        deductions.put("otherDeductions", payroll.getOtherDeductions());
        deductions.put("totalDeductions", payroll.getTotalDeductions());
        payslipData.put("deductions", deductions);
        
        // Flatten deductions to top-level
        payslipData.put("professionalTax", payroll.getProfessionalTax());
        payslipData.put("tds", payroll.getTds());
        payslipData.put("npsEmployee", payroll.getNpsEmployeeShare());
        payslipData.put("npsEmployeeShare", payroll.getNpsEmployeeShare());
        payslipData.put("cghs", payroll.getCghs());
        payslipData.put("otherDeductions", payroll.getOtherDeductions());
        payslipData.put("totalDeductions", payroll.getTotalDeductions());

        // Net salary
        payslipData.put("netSalary", payroll.getNetSalary());

        // Approval details
        payslipData.put("approvedBy", payroll.getApprovedBy());
        payslipData.put("approvedDate", payroll.getApprovedAt());
        payslipData.put("generatedDate", java.time.LocalDate.now());

        return payslipData;
    }

    public String generatePayslipPDF(String payrollId) {
        java.util.Map<String, Object> payslipData = generatePayslip(payrollId);
        log.info("PDF generation for payslip: {}", payrollId);
        return "payslip_" + payrollId + ".pdf";
    }

    public void sendPayslipEmail(String payrollId, String recipientEmail) {
        Payroll payroll = payrollRepository.findById(payrollId)
                .orElseThrow(() -> new RuntimeException("Payroll not found"));

        User user = userRepository.findById(payroll.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        log.info("Sending payslip email to {}", recipientEmail);

        notificationService.createNotification(payroll.getUserId(), "PAYSLIP_EMAILED",
                "Payslip Sent",
                "Your payslip has been sent to " + recipientEmail,
                "MEDIUM");
    }

    private String maskAccountNumber(String accountNumber) {
        if (accountNumber == null || accountNumber.length() < 4) {
            return "****";
        }
        return "****" + accountNumber.substring(accountNumber.length() - 4);
    }

    public String getMonthName(int month) {
        String[] months = {"", "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"};
        return (month >= 1 && month <= 12) ? months[month] : "";
    }
}
