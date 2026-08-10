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

        if (!payroll.getStatus().equals("APPROVED")) {
            throw new RuntimeException("Only approved payroll can be used for payslip generation");
        }

        // Generate payslip data
        java.util.Map<String, Object> payslipData = new java.util.HashMap<>();

        // Company details
        payslipData.put("companyName", "Indian Institute of Petroleum & Energy");
        payslipData.put("companyAddress", "Visakhapatnam, India");
        payslipData.put("companyLogo", "logo.png");

        // Employee details
        payslipData.put("employeeName", user.getFirstName() + " " + user.getLastName());
        payslipData.put("employeeId", user.getEmployeeId());
        payslipData.put("designation", user.getDesignation());
        payslipData.put("department", user.getDepartment());
        payslipData.put("panNumber", user.getPan());
        payslipData.put("aadharNumber", user.getAadhar());

        // Payroll period
        YearMonth period = YearMonth.of(payroll.getYear(), payroll.getMonth());
        payslipData.put("payrollPeriod", period.toString());
        payslipData.put("month", getMonthName(payroll.getMonth()));
        payslipData.put("year", payroll.getYear());

        // Earnings
        java.util.Map<String, Object> earnings = new java.util.HashMap<>();
        earnings.put("basicPay", payroll.getBasicPay());
        earnings.put("da", payroll.getDa());
        earnings.put("hra", payroll.getHra());
        earnings.put("ta", payroll.getTa());
        earnings.put("npsEmployerShare", payroll.getNpsEmployerShare());
        earnings.put("grossSalary", payroll.getGrossSalary());
        payslipData.put("earnings", earnings);

        // Deductions
        java.util.Map<String, Object> deductions = new java.util.HashMap<>();
        deductions.put("professionalTax", payroll.getProfessionalTax());
        deductions.put("tds", payroll.getTds());
        deductions.put("npsEmployee", payroll.getNpsEmployeeShare());
        deductions.put("cghs", payroll.getCghs());
        deductions.put("otherDeductions", payroll.getOtherDeductions());
        deductions.put("totalDeductions", payroll.getTotalDeductions());
        payslipData.put("deductions", deductions);

        // Net salary
        payslipData.put("netSalary", payroll.getNetSalary());

        // Bank details
        payslipData.put("bankName", user.getBankName());
        payslipData.put("bankAccountNumber", maskAccountNumber(user.getBankAccountNumber()));
        payslipData.put("ifscCode", user.getIfscCode());

        // Approval details
        payslipData.put("approvedBy", payroll.getApprovedBy());
        payslipData.put("approvedDate", payroll.getApprovedAt());
        payslipData.put("generatedDate", java.time.LocalDate.now());

        log.info("Payslip generated for employee {}", user.getEmployeeId());

        // Notify employee
        notificationService.createNotification(payroll.getUserId(), "PAYSLIP_GENERATED",
                "Payslip Generated",
                "Your payslip for " + getMonthName(payroll.getMonth()) + " " + payroll.getYear() + " is ready for download",
                "HIGH");

        return payslipData;
    }

    public String generatePayslipPDF(String payrollId) {
        java.util.Map<String, Object> payslipData = generatePayslip(payrollId);
        log.info("PDF generation for payslip: {}", payrollId);
        // PDF generation will be handled by PdfGenerator utility
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

    private String getMonthName(int month) {
        String[] months = {"", "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"};
        return months[month];
    }
}
