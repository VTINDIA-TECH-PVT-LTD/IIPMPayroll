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
                .orElseThrow(() -> new RuntimeException("User not found"));

        // FY and AY logic
        String financialYear = year + "-" + (year + 1);
        String assessmentYear = (year + 1) + "-" + (year + 2);

        List<Payroll> payrolls = payrollRepository.findByUserIdAndYear(userId, year);
        ItDeclaration declaration = itDeclarationRepository.findByUserIdAndFinancialYear(userId, financialYear).orElse(null);

        Form16DTO dto = new Form16DTO();
        
        // Employer details
        dto.setEmployerName("INDIAN INSTITUTE OF PETROLEUM & ENERGY");
        dto.setEmployerAddress("2nd Floor, AU Engg College, Andhra University, Visakhapatnam - 530003, Andhra Pradesh");
        dto.setEmployerPAN("AABAI0046C");
        dto.setEmployerTAN("VPNI00723C");

        // Employee details
        dto.setEmployeeName(user.getFirstName() + " " + user.getLastName());
        dto.setEmployeePAN(user.getPan() != null ? user.getPan() : "ASKPY8597N"); // Fallback for demo
        dto.setEmployeeId(user.getEmployeeId());
        dto.setEmployeeAddress(user.getLocation() != null ? user.getLocation() : "1-161, MALLUNAIDUPALEM, VISAKHAPATNAM - 531035 Andhra Pradesh");
        dto.setAssessmentYear(assessmentYear);
        dto.setFinancialYear(financialYear);

        // Compute payroll sums
        double grossSalary = 0;
        double totalTds = 0;
        double professionalTax = 0;
        for (Payroll p : payrolls) {
            grossSalary += p.getGrossSalary();
            totalTds += p.getTds();
            professionalTax += p.getProfessionalTax();
        }

        // Quarter-wise dummy data (Assuming evenly split for demo)
        double qGross = grossSalary / 4;
        double qTds = totalTds / 4;
        dto.setQuarterlyTdsList(Arrays.asList(
                new Form16DTO.QuarterlyTds("Q1", "FXCMZZQR", qGross, qTds, qTds),
                new Form16DTO.QuarterlyTds("Q2", "FXDPPTAA", qGross, qTds, qTds),
                new Form16DTO.QuarterlyTds("Q3", "FXDUSMWB", qGross, qTds, qTds),
                new Form16DTO.QuarterlyTds("Q4", "FXDXTLGX", qGross, qTds, qTds)
        ));

        // Dummy challans
        dto.setChallanDetails(Arrays.asList(
                new Form16DTO.ChallanDetail("-", "07-05-" + year, "F", qTds),
                new Form16DTO.ChallanDetail("-", "05-08-" + year, "F", qTds),
                new Form16DTO.ChallanDetail("-", "03-01-" + (year + 1), "F", qTds),
                new Form16DTO.ChallanDetail("-", "30-04-" + (year + 1), "F", qTds)
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
        dto.setHomeLoanInterest(homeLoan);
        dto.setTotalChapterVIADeductions(sec80C + sec80D + homeLoan);
        
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
