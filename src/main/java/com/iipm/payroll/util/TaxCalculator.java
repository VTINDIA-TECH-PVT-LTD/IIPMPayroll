package com.iipm.payroll.util;

import com.iipm.payroll.model.ItDeclaration;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class TaxCalculator {

    private static final double STANDARD_DEDUCTION_OLD = 50000.0;
    private static final double STANDARD_DEDUCTION_NEW = 75000.0;
    private static final double MAX_80C_DEDUCTION = 150000.0;

    public double calculateAnnualTax(double projectedAnnualIncome, ItDeclaration declaration) {
        if (projectedAnnualIncome <= 0) {
            return 0.0;
        }

        String regime = (declaration != null && declaration.getTaxRegime() != null) 
                ? declaration.getTaxRegime().toUpperCase() : "NEW";

        if ("NEW".equals(regime)) {
            return calculateNewRegime(projectedAnnualIncome);
        } else {
            return calculateOldRegime(projectedAnnualIncome, declaration);
        }
    }

    private double calculateNewRegime(double income) {
        double taxableIncome = income - STANDARD_DEDUCTION_NEW;
        if (taxableIncome <= 300000) return 0.0;

        double tax = 0.0;

        // Rebate u/s 87A (New regime: taxable income up to 7,00,000 gets full rebate up to 25,000)
        boolean isRebateApplicable = taxableIncome <= 700000;

        // FY 2024-25 / 2025-26 Slabs
        if (taxableIncome > 300000) tax += (Math.min(taxableIncome, 700000) - 300000) * 0.05;
        if (taxableIncome > 700000) tax += (Math.min(taxableIncome, 1000000) - 700000) * 0.10;
        if (taxableIncome > 1000000) tax += (Math.min(taxableIncome, 1200000) - 1000000) * 0.15;
        if (taxableIncome > 1200000) tax += (Math.min(taxableIncome, 1500000) - 1200000) * 0.20;
        if (taxableIncome > 1500000) tax += (taxableIncome - 1500000) * 0.30;

        if (isRebateApplicable) {
            tax -= Math.min(tax, 25000.0);
        }

        if (tax > 0) {
            tax += tax * 0.04; // 4% Health & Education Cess
        }

        return Math.max(0.0, tax);
    }

    private double calculateOldRegime(double income, ItDeclaration declaration) {
        double totalExemptions = STANDARD_DEDUCTION_OLD;
        
        if (declaration != null && "APPROVED".equalsIgnoreCase(declaration.getStatus())) {
            double sec80C = Math.min(declaration.getSection80C(), MAX_80C_DEDUCTION);
            double sec80D = declaration.getSection80D();
            double hra = declaration.getHraExemption();
            double homeLoan = Math.min(declaration.getHomeLoanInterest(), 200000.0);
            
            totalExemptions += (sec80C + sec80D + hra + homeLoan);
        }

        double taxableIncome = income - totalExemptions;
        if (taxableIncome <= 250000) return 0.0;

        double tax = 0.0;
        boolean isRebateApplicable = taxableIncome <= 500000;

        if (taxableIncome > 250000) tax += (Math.min(taxableIncome, 500000) - 250000) * 0.05;
        if (taxableIncome > 500000) tax += (Math.min(taxableIncome, 1000000) - 500000) * 0.20;
        if (taxableIncome > 1000000) tax += (taxableIncome - 1000000) * 0.30;

        if (isRebateApplicable) {
            tax -= Math.min(tax, 12500.0);
        }

        if (tax > 0) {
            tax += tax * 0.04;
        }

        return Math.max(0.0, tax);
    }
    
    public double calculateMonthlyTds(double projectedAnnualIncome, ItDeclaration declaration) {
        double annualTax = calculateAnnualTax(projectedAnnualIncome, declaration);
        return Math.round(annualTax / 12.0);
    }
}
