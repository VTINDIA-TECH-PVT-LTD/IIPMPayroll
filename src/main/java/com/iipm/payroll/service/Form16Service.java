package com.iipm.payroll.service;

import com.iipm.payroll.dto.Form16DTO;
import com.iipm.payroll.model.ItDeclaration;
import com.iipm.payroll.model.Payroll;
import com.iipm.payroll.model.User;
import com.iipm.payroll.repository.ItDeclarationRepository;
import com.iipm.payroll.repository.PayrollRepository;
import com.iipm.payroll.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class Form16Service {

    @Autowired
    private PayrollRepository payrollRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ItDeclarationRepository itDeclarationRepository;

    @Autowired
    private SettingService settingService;

    private static final double STANDARD_DEDUCTION_OLD = 50000.0;
    private static final double STANDARD_DEDUCTION_NEW = 75000.0;

    private String getSettingOrDefault(String key, String defaultValue) {
        if (settingService != null) {
            String val = settingService.getSettingValueByKey(key);
            if (val != null && !val.trim().isEmpty()) {
                return val.trim();
            }
        }
        return defaultValue;
    }

    public Form16DTO generateForm16(String userId, int year) {
        User user = userRepository.findById(userId)
                .orElseGet(() -> userRepository.findByEmployeeId(userId)
                        .orElseThrow(() -> new RuntimeException("User not found: " + userId)));

        // FY and AY logic
        String financialYear = year + "-" + (year + 1);
        String assessmentYear = (year + 1) + "-" + (year + 2);
        String periodFrom = "01-Apr-" + year;
        String periodTo = "31-Mar-" + (year + 1);

        List<Payroll> payrolls = new ArrayList<>();
        List<Payroll> p1 = payrollRepository.findByUserIdOrEmployeeIdAndYear(user.getId(), user.getEmployeeId(), year);
        if (p1 != null) payrolls.addAll(p1);
        
        List<Payroll> p2 = payrollRepository.findByUserIdOrEmployeeIdAndYear(user.getId(), user.getEmployeeId(), year + 1);
        if (p2 != null) {
            for (Payroll p : p2) {
                if (p.getMonth() >= 1 && p.getMonth() <= 3) {
                    payrolls.add(p);
                }
            }
        }

        if (payrolls.isEmpty()) {
            payrolls = payrollRepository.findByUserIdOrderByYearDescMonthDesc(user.getId());
        }

        ItDeclaration declaration = itDeclarationRepository.findByUserIdAndFinancialYear(userId, financialYear).orElse(null);

        Form16DTO dto = new Form16DTO();
        
        // Dynamic Employer details from MongoDB settings
        dto.setEmployerName(getSettingOrDefault("FORM16_EMPLOYER_NAME", "INDIAN INSTITUTE OF PETROLEUM & ENERGY"));
        dto.setEmployerAddress(getSettingOrDefault("FORM16_EMPLOYER_ADDRESS", "Tech-Horizon Building, Andhra University Campus, Visakhapatnam - 530003, Andhra Pradesh, India"));
        dto.setEmployerEmail(getSettingOrDefault("FORM16_EMPLOYER_EMAIL", "fo@iipe.ac.in"));
        dto.setEmployerPAN(getSettingOrDefault("FORM16_EMPLOYER_PAN", "AABAI0046C"));
        dto.setEmployerTAN(getSettingOrDefault("FORM16_EMPLOYER_TAN", "VPNI00723C"));
        dto.setCitTds(getSettingOrDefault("FORM16_CIT_TDS", "The Commissioner of Income Tax (TDS)\nRoom No. 411, Income Tax Towers, 10-2-3 A.C. Guard,\nHyderabad - 500004"));

        // Certificate metadata
        dto.setCertificateNo(getSettingOrDefault("FORM16_CERTIFICATE_NO", "ACORZOA"));
        
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd-MMM-yyyy", Locale.ENGLISH);
        String currentDateStr = LocalDate.now().format(dtf);
        dto.setLastUpdatedOn(getSettingOrDefault("FORM16_LAST_UPDATED", currentDateStr));
        dto.setIssueDate(getSettingOrDefault("FORM16_ISSUE_DATE", currentDateStr));

        // Employee details
        dto.setEmployeeName(user.getFirstName() + " " + user.getLastName());
        dto.setEmployeePAN(user.getPan() != null && !user.getPan().isEmpty() ? user.getPan() : "ASKPY8597N");
        dto.setEmployeeId(user.getEmployeeId() != null ? user.getEmployeeId() : "NT1005");
        dto.setEmployeeAddress(user.getLocation() != null && !user.getLocation().isEmpty() ? user.getLocation() : "Visakhapatnam");
        dto.setAssessmentYear(assessmentYear);
        dto.setFinancialYear(financialYear);
        dto.setPeriodFrom(periodFrom);
        dto.setPeriodTo(periodTo);

        // Signatory details from settings
        dto.setSignatoryName(getSettingOrDefault("FORM16_SIGNATORY_NAME", "Dr. Ram Phal Dwivedi"));
        dto.setSignatoryFatherName(getSettingOrDefault("FORM16_SIGNATORY_FATHER_NAME", ""));
        dto.setSignatoryDesignation(getSettingOrDefault("FORM16_SIGNATORY_DESIGNATION", "Registrar / Authorised Signatory"));
        dto.setPlace(getSettingOrDefault("FORM16_PLACE", "Visakhapatnam"));

        // Compute payroll sums and actual quarterly values
        double grossSalary = 0;
        double totalTds = 0;
        double professionalTax = 0;
        double totalNpsEmployer = 0;

        double q1Gross = 0, q1Tds = 0; // Months 4, 5, 6
        double q2Gross = 0, q2Tds = 0; // Months 7, 8, 9
        double q3Gross = 0, q3Tds = 0; // Months 10, 11, 12
        double q4Gross = 0, q4Tds = 0; // Months 1, 2, 3

        for (Payroll p : payrolls) {
            double g = p.getGrossSalary();
            double t = p.getTds();
            double pt = p.getProfessionalTax();
            double npsEmp = p.getNpsEmployerShare();

            grossSalary += g;
            totalTds += t;
            professionalTax += pt;
            totalNpsEmployer += npsEmp;

            int m = p.getMonth();
            if (m >= 4 && m <= 6) {
                q1Gross += g; q1Tds += t;
            } else if (m >= 7 && m <= 9) {
                q2Gross += g; q2Tds += t;
            } else if (m >= 10 && m <= 12) {
                q3Gross += g; q3Tds += t;
            } else if (m >= 1 && m <= 3) {
                q4Gross += g; q4Tds += t;
            }
        }

        if (totalNpsEmployer == 0 && user.getBasicPay() != null && user.getBasicPay() > 0) {
            double da = user.getBasicPay() * 0.60;
            totalNpsEmployer = (user.getBasicPay() + da) * 0.14 * (payrolls.isEmpty() ? 12 : payrolls.size());
        }

        // Receipt Numbers from settings (default blank/- if not configured)
        String q1Receipt = getSettingOrDefault("FORM16_Q1_RECEIPT", "");
        String q2Receipt = getSettingOrDefault("FORM16_Q2_RECEIPT", "");
        String q3Receipt = getSettingOrDefault("FORM16_Q3_RECEIPT", "");
        String q4Receipt = getSettingOrDefault("FORM16_Q4_RECEIPT", "");

        dto.setQuarterlyTdsList(Arrays.asList(
                new Form16DTO.QuarterlyTds("Q1", q1Receipt, q1Gross, q1Tds, q1Tds),
                new Form16DTO.QuarterlyTds("Q2", q2Receipt, q2Gross, q2Tds, q2Tds),
                new Form16DTO.QuarterlyTds("Q3", q3Receipt, q3Gross, q3Tds, q3Tds),
                new Form16DTO.QuarterlyTds("Q4", q4Receipt, q4Gross, q4Tds, q4Tds)
        ));

        // Challan Details from settings
        String q1Bsr = getSettingOrDefault("FORM16_Q1_BSR", "");
        String q2Bsr = getSettingOrDefault("FORM16_Q2_BSR", "");
        String q3Bsr = getSettingOrDefault("FORM16_Q3_BSR", "");
        String q4Bsr = getSettingOrDefault("FORM16_Q4_BSR", "");

        String q1Date = getSettingOrDefault("FORM16_Q1_CHALLAN_DATE", "");
        String q2Date = getSettingOrDefault("FORM16_Q2_CHALLAN_DATE", "");
        String q3Date = getSettingOrDefault("FORM16_Q3_CHALLAN_DATE", "");
        String q4Date = getSettingOrDefault("FORM16_Q4_CHALLAN_DATE", "");

        String q1Serial = getSettingOrDefault("FORM16_Q1_CHALLAN_SERIAL", "");
        String q2Serial = getSettingOrDefault("FORM16_Q2_CHALLAN_SERIAL", "");
        String q3Serial = getSettingOrDefault("FORM16_Q3_CHALLAN_SERIAL", "");
        String q4Serial = getSettingOrDefault("FORM16_Q4_CHALLAN_SERIAL", "");

        dto.setChallanDetails(Arrays.asList(
                new Form16DTO.ChallanDetail(q1Bsr, q1Date, q1Serial, q1Tds, "F"),
                new Form16DTO.ChallanDetail(q2Bsr, q2Date, q2Serial, q2Tds, "F"),
                new Form16DTO.ChallanDetail(q3Bsr, q3Date, q3Serial, q3Tds, "F"),
                new Form16DTO.ChallanDetail(q4Bsr, q4Date, q4Serial, q4Tds, "F")
        ));
        dto.setTotalTdsDeposited(totalTds);

        // Part B Calculations
        dto.setGrossSalary(grossSalary);
        dto.setProfessionalTax(professionalTax);
        
        String regime = (declaration != null && declaration.getTaxRegime() != null) ? declaration.getTaxRegime().toUpperCase() : "NEW";
        
        double exemptHra = 0;
        double sec80C = 0;
        double sec80D = 0;
        double homeLoan = 0;

        if ("OLD".equals(regime)) {
            dto.setStandardDeduction(STANDARD_DEDUCTION_OLD);
            if (declaration != null && ("APPROVED".equalsIgnoreCase(declaration.getStatus()) || "PENDING".equalsIgnoreCase(declaration.getStatus()))) {
                exemptHra = declaration.getHraExemption();
                sec80C = Math.min(declaration.getSection80C(), 150000.0);
                sec80D = declaration.getSection80D();
                homeLoan = Math.min(declaration.getHomeLoanInterest(), 200000.0);
            }
        } else {
            dto.setStandardDeduction(STANDARD_DEDUCTION_NEW);
        }

        dto.setAllowancesExemptUpto10(exemptHra);
        dto.setBalance(grossSalary - exemptHra);
        dto.setIncomeChargeableUnderSalaries(Math.max(0, dto.getBalance() - dto.getStandardDeduction() - professionalTax));
        
        dto.setGrossTotalIncome(dto.getIncomeChargeableUnderSalaries());

        dto.setDeduction80C(sec80C);
        dto.setDeduction80D(sec80D);
        dto.setDeduction80CCD2(totalNpsEmployer);
        dto.setDeduction80CCD(totalNpsEmployer);
        dto.setHomeLoanInterest(homeLoan);
        dto.setTotalChapterVIADeductions(sec80C + sec80D + homeLoan + totalNpsEmployer);
        
        double taxableIncome = Math.max(0, dto.getGrossTotalIncome() - dto.getTotalChapterVIADeductions());
        dto.setTotalTaxableIncome(taxableIncome);

        // Tax calculation matching TaxCalculator breakdown
        double tax = 0;
        double rebate = 0;
        
        if ("NEW".equals(regime)) {
            if (taxableIncome > 300000) {
                if (taxableIncome > 300000) tax += (Math.min(taxableIncome, 700000) - 300000) * 0.05;
                if (taxableIncome > 700000) tax += (Math.min(taxableIncome, 1000000) - 700000) * 0.10;
                if (taxableIncome > 1000000) tax += (Math.min(taxableIncome, 1200000) - 1000000) * 0.15;
                if (taxableIncome > 1200000) tax += (Math.min(taxableIncome, 1500000) - 1200000) * 0.20;
                if (taxableIncome > 1500000) tax += (taxableIncome - 1500000) * 0.30;
                
                if (taxableIncome <= 700000) {
                    rebate = Math.min(tax, 25000.0);
                    tax -= rebate;
                }
            }
        } else {
            if (taxableIncome > 250000) {
                if (taxableIncome > 250000) tax += (Math.min(taxableIncome, 500000) - 250000) * 0.05;
                if (taxableIncome > 500000) tax += (Math.min(taxableIncome, 1000000) - 500000) * 0.20;
                if (taxableIncome > 1000000) tax += (taxableIncome - 1000000) * 0.30;
                
                if (taxableIncome <= 500000) {
                    rebate = Math.min(tax, 12500.0);
                    tax -= rebate;
                }
            }
        }

        dto.setTaxOnTotalIncome(tax + rebate);
        dto.setRebate87A(rebate);
        
        double cess = (tax > 0) ? tax * 0.04 : 0;
        dto.setHealthAndEducationCess(cess);
        dto.setSurcharge(0);
        dto.setTotalTaxPayable(tax + cess);
        
        dto.setTaxDeductedAtSource(totalTds);
        dto.setTaxPayableOrRefundable(dto.getTotalTaxPayable() - totalTds);

        return dto;
    }
}
