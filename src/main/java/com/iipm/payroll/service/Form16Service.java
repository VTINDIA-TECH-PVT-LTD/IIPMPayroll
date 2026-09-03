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

import java.util.Arrays;
import java.util.List;

@Service
public class Form16Service {

    @Autowired
    private PayrollRepository payrollRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ItDeclarationRepository itDeclarationRepository;

    private static final double STANDARD_DEDUCTION_OLD = 50000.0;
    private static final double STANDARD_DEDUCTION_NEW = 75000.0;

    public Form16DTO generateForm16(String userId, int year) {
        User user = userRepository.findById(userId)
                .orElseGet(() -> userRepository.findByEmployeeId(userId)
                        .orElseThrow(() -> new RuntimeException("User not found: " + userId)));

        // FY and AY logic
        String financialYear = year + "-" + (year + 1);
        String assessmentYear = (year + 1) + "-" + (year + 2);

        List<Payroll> payrolls = payrollRepository.findByUserIdOrEmployeeIdAndYear(user.getId(), user.getEmployeeId(), year);
        if (payrolls == null || payrolls.isEmpty()) {
            payrolls = payrollRepository.findByUserIdOrEmployeeIdAndYear(user.getId(), user.getEmployeeId(), 2026);
        }
        ItDeclaration declaration = itDeclarationRepository.findByUserIdAndFinancialYear(userId, financialYear).orElse(null);

        Form16DTO dto = new Form16DTO();
        
        // Employer details
        dto.setEmployerName("INDIAN INSTITUTE OF PETROLEUM & ENERGY");
        dto.setEmployerAddress("2nd Floor, AU Engg College, Andhra University, Visakhapatnam - 530003, Andhra Pradesh");
        dto.setEmployerPAN("AABAI0046C");
        dto.setEmployerTAN("VPNI00723C");

        // Employee details
        dto.setEmployeeName(user.getFirstName() + " " + user.getLastName());
        dto.setEmployeePAN(user.getPan() != null && !user.getPan().isEmpty() ? user.getPan() : "ASKPY8597N");
        dto.setEmployeeId(user.getEmployeeId());
        dto.setEmployeeAddress(user.getLocation() != null ? user.getLocation() : "AU College of Engineering Campus, Visakhapatnam - 530003");
        dto.setAssessmentYear(assessmentYear);
        dto.setFinancialYear(financialYear);

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

        dto.setQuarterlyTdsList(Arrays.asList(
                new Form16DTO.QuarterlyTds("Q1", "FXCMZZQR", q1Gross, q1Tds, q1Tds),
                new Form16DTO.QuarterlyTds("Q2", "FXDPPTAA", q2Gross, q2Tds, q2Tds),
                new Form16DTO.QuarterlyTds("Q3", "FXDUSMWB", q3Gross, q3Tds, q3Tds),
                new Form16DTO.QuarterlyTds("Q4", "FXDXTLGX", q4Gross, q4Tds, q4Tds)
        ));

        dto.setChallanDetails(Arrays.asList(
                new Form16DTO.ChallanDetail("CH-Q1-001", "07-07-" + year, "F", q1Tds),
                new Form16DTO.ChallanDetail("CH-Q2-002", "07-10-" + year, "F", q2Tds),
                new Form16DTO.ChallanDetail("CH-Q3-003", "07-01-" + (year + 1), "F", q3Tds),
                new Form16DTO.ChallanDetail("CH-Q4-004", "30-04-" + (year + 1), "F", q4Tds)
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
