package com.iipm.payroll.util;

import com.iipm.payroll.model.ItDeclaration;
import com.iipm.payroll.service.SettingService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class TaxCalculator {

    @Autowired(required = false)
    private SettingService settingService;

    // Fallback statutory defaults under Income Tax Act, 1961
    private static final double DEFAULT_STANDARD_DEDUCTION_OLD = 50000.0;
    private static final double DEFAULT_STANDARD_DEDUCTION_NEW = 75000.0;
    private static final double DEFAULT_MAX_80C_DEDUCTION = 150000.0;
    private static final double DEFAULT_ANNUAL_PROFESSIONAL_TAX = 2400.0;

    public double getStandardDeductionNew() {
        if (settingService != null) {
            Double val = settingService.getSettingAsDouble("STANDARD_DEDUCTION_NEW");
            if (val != null && val > 0) return val;
        }
        return DEFAULT_STANDARD_DEDUCTION_NEW;
    }

    public double getStandardDeductionOld() {
        if (settingService != null) {
            Double val = settingService.getSettingAsDouble("STANDARD_DEDUCTION_OLD");
            if (val != null && val > 0) return val;
        }
        return DEFAULT_STANDARD_DEDUCTION_OLD;
    }

    public double getMax80CDeduction() {
        if (settingService != null) {
            Double val = settingService.getSettingAsDouble("MAX_80C_DEDUCTION");
            if (val != null && val > 0) return val;
        }
        return DEFAULT_MAX_80C_DEDUCTION;
    }

    public double getAnnualProfessionalTax() {
        if (settingService != null) {
            Double pt = settingService.getSettingAsDouble("PT_AMOUNT");
            if (pt != null && pt > 0) return pt * 12.0;
        }
        return DEFAULT_ANNUAL_PROFESSIONAL_TAX;
    }

    public double calculateAnnualTax(double projectedAnnualIncome, double annualNpsEmployerShare, ItDeclaration declaration) {
        if (projectedAnnualIncome <= 0) {
            return 0.0;
        }

        String regime = (declaration != null && declaration.getTaxRegime() != null) 
                ? declaration.getTaxRegime().toUpperCase() : "NEW";

        if ("NEW".equals(regime)) {
            return calculateNewRegime(projectedAnnualIncome, annualNpsEmployerShare);
        } else {
            return calculateOldRegime(projectedAnnualIncome, annualNpsEmployerShare, declaration);
        }
    }

    public double calculateAnnualTax(double projectedAnnualIncome, ItDeclaration declaration) {
        return calculateAnnualTax(projectedAnnualIncome, 0.0, declaration);
    }

    private double calculateNewRegime(double income, double annualNpsEmployerShare) {
        // Under New Regime:
        // Standard Deduction: ₹75,000 (configurable)
        // Section 80CCD(2): Employer NPS Contribution (14% of Basic + DA)
        // Professional Tax: ₹2,400 (configurable)
        double stdDed = getStandardDeductionNew();
        double pt = getAnnualProfessionalTax();

        double taxableIncome = Math.max(0.0, income - stdDed - annualNpsEmployerShare - pt);
        if (taxableIncome <= 300000) return 0.0;

        double tax = 0.0;

        // Rebate u/s 87A (New regime: taxable income up to 7,00,000 gets full rebate up to 25,000)
        boolean isRebateApplicable = taxableIncome <= 700000;

        // FY 2024-25 & 2025-26 Slabs:
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

    private double calculateOldRegime(double income, double annualNpsEmployerShare, ItDeclaration declaration) {
        double stdDed = getStandardDeductionOld();
        double pt = getAnnualProfessionalTax();
        double max80c = getMax80CDeduction();

        double totalExemptions = stdDed + annualNpsEmployerShare + pt;
        
        if (declaration != null && "APPROVED".equalsIgnoreCase(declaration.getStatus())) {
            double sec80C = Math.min(declaration.getSection80C(), max80c);
            double sec80D = declaration.getSection80D();
            double hra = declaration.getHraExemption();
            double homeLoan = Math.min(declaration.getHomeLoanInterest(), 200000.0);
            
            totalExemptions += (sec80C + sec80D + hra + homeLoan);
        }

        double taxableIncome = Math.max(0.0, income - totalExemptions);
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
    
    public double calculateMonthlyTds(double projectedAnnualIncome, double annualNpsEmployerShare, ItDeclaration declaration) {
        double annualTax = calculateAnnualTax(projectedAnnualIncome, annualNpsEmployerShare, declaration);
        return Math.round(annualTax / 12.0);
    }

    public double calculateMonthlyTds(double projectedAnnualIncome, ItDeclaration declaration) {
        return calculateMonthlyTds(projectedAnnualIncome, 0.0, declaration);
    }
}
