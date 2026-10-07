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

        // Financial Year: 01-Apr-year to 31-Mar-(year+1)
        String financialYear = year + "-" + (year + 1);
        String financialYearShort = year + "-" + String.valueOf(year + 1).substring(2);
        String assessmentYear = (year + 1) + "-" + (year + 2);
        String taxYear = year + "-" + (year + 1);
        String periodFrom = "01-Apr-" + year;
        String periodTo = "31-Mar-" + (year + 1);

        // Fetch IT Declaration if any
        ItDeclaration declaration = itDeclarationRepository.findByUserIdAndFinancialYear(user.getId(), financialYear)
                .orElseGet(() -> itDeclarationRepository.findByUserIdAndFinancialYear(user.getId(), financialYearShort)
                        .orElseGet(() -> itDeclarationRepository.findByUserIdAndFinancialYear(user.getEmployeeId(), financialYear)
                                .orElseGet(() -> itDeclarationRepository.findByUserIdAndFinancialYear(user.getEmployeeId(), financialYearShort)
                                        .orElse(null))));

        String userRegime = user.getTaxRegime() != null ? user.getTaxRegime().toUpperCase() : "NEW";
        String regime = (declaration != null && declaration.getTaxRegime() != null) ? declaration.getTaxRegime().toUpperCase() : userRegime;
        boolean isOldRegime = regime.contains("OLD");
        String optedOut = isOldRegime ? "Yes" : "No";

        // 1. Calculate standard monthly salary components from user profile (used as fallback only if 0 payrolls exist)
        double basic = user.getBasicPay() != null ? user.getBasicPay() : 0.0;
        double daPct = settingService.getSettingAsDouble("DA_PERCENTAGE") != null ? settingService.getSettingAsDouble("DA_PERCENTAGE") : 60.0;
        double hraPct = settingService.getSettingAsDouble("HRA_PERCENTAGE") != null ? settingService.getSettingAsDouble("HRA_PERCENTAGE") : 20.0;
        
        double da = basic * daPct / 100.0;
        double hra = basic * hraPct / 100.0;
        
        double taBase = 3600.0;
        if (user.getPayLevel() != null) {
            try {
                int lvl = Integer.parseInt(user.getPayLevel().replaceAll("[^0-9]", ""));
                if (lvl < 10) taBase = 1800.0;
            } catch (Exception ignored) {}
        }
        double ta = taBase * (1.0 + daPct / 100.0);
        double specialAllowance = (user.getDeanAllowance() != null && user.getDeanAllowance() > 0) ? user.getDeanAllowance() 
                : ((user.getSpecialAllowance() != null) ? user.getSpecialAllowance() : 0.0);
        double monthlyNpsEmployer = (basic + da) * 0.14;
        double stdMonthlyGross = basic + da + hra + ta + specialAllowance + monthlyNpsEmployer;
        double stdMonthlyPt = (basic >= 20000) ? 200.0 : 0.0;

        // 2. Fetch existing payrolls for the 12 months in this Financial Year
        // Months 4..12 of year, Months 1..3 of year+1
        Map<String, Payroll> payrollMap = new HashMap<>();
        List<Payroll> pList1 = payrollRepository.findByUserIdOrEmployeeIdAndYear(user.getId(), user.getEmployeeId(), year);
        if (pList1 != null) {
            for (Payroll p : pList1) {
                if (p.getMonth() >= 4 && p.getMonth() <= 12) {
                    payrollMap.put(p.getMonth() + "_" + p.getYear(), p);
                }
            }
        }
        List<Payroll> pList2 = payrollRepository.findByUserIdOrEmployeeIdAndYear(user.getId(), user.getEmployeeId(), year + 1);
        if (pList2 != null) {
            for (Payroll p : pList2) {
                if (p.getMonth() >= 1 && p.getMonth() <= 3) {
                    payrollMap.put(p.getMonth() + "_" + p.getYear(), p);
                }
            }
        }

        double q1Gross = 0, q1Tds = 0, q1Pt = 0, q1Nps = 0; int q1Count = 0;
        double q2Gross = 0, q2Tds = 0, q2Pt = 0, q2Nps = 0; int q2Count = 0;
        double q3Gross = 0, q3Tds = 0, q3Pt = 0, q3Nps = 0; int q3Count = 0;
        double q4Gross = 0, q4Tds = 0, q4Pt = 0, q4Nps = 0; int q4Count = 0;

        // Q1: Apr, May, Jun (Months 4, 5, 6 of year)
        for (int m = 4; m <= 6; m++) {
            Payroll p = payrollMap.get(m + "_" + year);
            if (p != null) {
                q1Gross += p.getGrossSalary();
                q1Tds += p.getTds();
                q1Pt += p.getProfessionalTax();
                q1Nps += p.getNpsEmployerShare();
                q1Count++;
            }
        }

        // Q2: Jul, Aug, Sep (Months 7, 8, 9 of year)
        for (int m = 7; m <= 9; m++) {
            Payroll p = payrollMap.get(m + "_" + year);
            if (p != null) {
                q2Gross += p.getGrossSalary();
                q2Tds += p.getTds();
                q2Pt += p.getProfessionalTax();
                q2Nps += p.getNpsEmployerShare();
                q2Count++;
            }
        }

        // Q3: Oct, Nov, Dec (Months 10, 11, 12 of year)
        for (int m = 10; m <= 12; m++) {
            Payroll p = payrollMap.get(m + "_" + year);
            if (p != null) {
                q3Gross += p.getGrossSalary();
                q3Tds += p.getTds();
                q3Pt += p.getProfessionalTax();
                q3Nps += p.getNpsEmployerShare();
                q3Count++;
            }
        }

        // Q4: Jan, Feb, Mar (Months 1, 2, 3 of year+1)
        for (int m = 1; m <= 3; m++) {
            Payroll p = payrollMap.get(m + "_" + (year + 1));
            if (p != null) {
                q4Gross += p.getGrossSalary();
                q4Tds += p.getTds();
                q4Pt += p.getProfessionalTax();
                q4Nps += p.getNpsEmployerShare();
                q4Count++;
            }
        }

        int totalMonthsWithPayroll = q1Count + q2Count + q3Count + q4Count;
        double grossSalary = 0, totalPt = 0, totalNpsEmployer = 0, totalTdsDeposited = 0;

        if (totalMonthsWithPayroll > 0) {
            // Use exact dynamic sums from actual database payroll records
            grossSalary = q1Gross + q2Gross + q3Gross + q4Gross;
            totalPt = q1Pt + q2Pt + q3Pt + q4Pt;
            totalNpsEmployer = q1Nps + q2Nps + q3Nps + q4Nps;
            totalTdsDeposited = q1Tds + q2Tds + q3Tds + q4Tds;
        } else {
            // Fallback for archive years with no stored monthly records (project 12 months)
            q1Gross = stdMonthlyGross * 3; q1Pt = stdMonthlyPt * 3; q1Nps = monthlyNpsEmployer * 3;
            q2Gross = stdMonthlyGross * 3; q2Pt = stdMonthlyPt * 3; q2Nps = monthlyNpsEmployer * 3;
            q3Gross = stdMonthlyGross * 3; q3Pt = stdMonthlyPt * 3; q3Nps = monthlyNpsEmployer * 3;
            q4Gross = stdMonthlyGross * 3; q4Pt = stdMonthlyPt * 3; q4Nps = monthlyNpsEmployer * 3;
            grossSalary = q1Gross + q2Gross + q3Gross + q4Gross;
            totalPt = q1Pt + q2Pt + q3Pt + q4Pt;
            totalNpsEmployer = q1Nps + q2Nps + q3Nps + q4Nps;
        }

        // 3. Part B Computations
        Form16DTO dto = new Form16DTO();
        dto.setGrossSalary(grossSalary);
        dto.setProfessionalTax(totalPt);
        dto.setOptedOut115BAC(optedOut);
        dto.setOldRegime(isOldRegime);

        double exemptHra = 0;
        double sec80C = 0;
        double sec80D = 0;
        double homeLoan = 0;

        if (isOldRegime) {
            dto.setStandardDeduction(STANDARD_DEDUCTION_OLD);
            if (declaration != null) {
                exemptHra = declaration.getHraExemption();
                sec80C = Math.min(declaration.getSection80C(), 150000.0);
                sec80D = declaration.getSection80D();
                homeLoan = Math.min(declaration.getHomeLoanInterest(), 200000.0);
            }
        } else {
            dto.setStandardDeduction(STANDARD_DEDUCTION_NEW);
        }

        dto.setAllowancesExemptUpto10(exemptHra);
        dto.setBalance(Math.max(0, grossSalary - exemptHra));
        dto.setIncomeChargeableUnderSalaries(Math.max(0, dto.getBalance() - dto.getStandardDeduction() - totalPt));
        dto.setGrossTotalIncome(dto.getIncomeChargeableUnderSalaries());

        dto.setDeduction80C(sec80C);
        dto.setDeduction80D(sec80D);
        dto.setDeduction80CCD2(totalNpsEmployer);
        dto.setDeduction80CCD(totalNpsEmployer);
        dto.setHomeLoanInterest(homeLoan);

        if (isOldRegime) {
            dto.setTotalChapterVIADeductions(sec80C + sec80D + homeLoan + totalNpsEmployer);
        } else {
            dto.setTotalChapterVIADeductions(totalNpsEmployer);
        }

        double taxableIncome = Math.max(0, dto.getGrossTotalIncome() - dto.getTotalChapterVIADeductions());
        dto.setTotalTaxableIncome(taxableIncome);

        // Tax calculation matching Indian statutory tax slabs
        double tax = 0;
        double rebate = 0;

        if (!isOldRegime) {
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

        double cess = (tax > 0) ? Math.round(tax * 0.04 * 100.0) / 100.0 : 0;
        dto.setHealthAndEducationCess(cess);
        dto.setSurcharge(0);
        double totalTaxPayable = Math.round((tax + cess) * 100.0) / 100.0;
        dto.setTotalTaxPayable(totalTaxPayable);

        if (totalMonthsWithPayroll == 0) {
            totalTdsDeposited = totalTaxPayable;
            if (grossSalary > 0) {
                q1Tds = Math.round(totalTaxPayable * (q1Gross / grossSalary) * 100.0) / 100.0;
                q2Tds = Math.round(totalTaxPayable * (q2Gross / grossSalary) * 100.0) / 100.0;
                q3Tds = Math.round(totalTaxPayable * (q3Gross / grossSalary) * 100.0) / 100.0;
                q4Tds = Math.max(0.0, Math.round((totalTaxPayable - q1Tds - q2Tds - q3Tds) * 100.0) / 100.0);
            }
        }

        dto.setTaxDeductedAtSource(totalTdsDeposited);
        dto.setTotalTdsDeposited(totalTdsDeposited);
        dto.setTaxPayableOrRefundable(Math.max(0.0, totalTaxPayable - totalTdsDeposited));

        // Receipt Numbers from settings
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

        // Statutory Form Title & Section per Financial Year
        if (year <= 2025) {
            // FY 2025-26
            dto.setFormNumber(getSettingOrDefault("FORM16_FORM_NO_2526", "FORM NO. 16"));
            dto.setFormRule(getSettingOrDefault("FORM16_RULE_2526", "[See rule 31(1)(a)]"));
            dto.setCertificateSectionText(getSettingOrDefault("FORM16_CERT_TEXT_2526",
                    "Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source on salary paid to an employee under section 192 or pension/interest income of specified senior citizen under section 194P"));
            dto.setTaxYearLabel(getSettingOrDefault("FORM16_TAX_YEAR_LABEL_2526", "Assessment Year"));
            dto.setTaxYear(assessmentYear);
        } else {
            // FY 2026-27 and later
            dto.setFormNumber(getSettingOrDefault("FORM16_FORM_NO_2627", "FORM NO. 130"));
            dto.setFormRule(getSettingOrDefault("FORM16_RULE_2627", "[See rule 31(1)(a)]"));
            dto.setCertificateSectionText(getSettingOrDefault("FORM16_CERT_TEXT_2627",
                    "Certificate under section 203 of the Income-tax Act, 2025 for tax deducted at source on salary paid to an employee under section 192 or pension/interest income of specified senior citizen under section 194P"));
            dto.setTaxYearLabel(getSettingOrDefault("FORM16_TAX_YEAR_LABEL_2627", "Tax Year"));
            dto.setTaxYear(taxYear);
        }

        // Employer details
        dto.setEmployerName(getSettingOrDefault("FORM16_EMPLOYER_NAME", "INDIAN INSTITUTE OF PETROLEUM AND ENERGY"));
        dto.setEmployerAddress(getSettingOrDefault("FORM16_EMPLOYER_ADDRESS", "Vangali, Sabbavaram, Anakapalle \u2013 531035, Andhra Pradesh, India"));
        dto.setEmployerEmail(getSettingOrDefault("FORM16_EMPLOYER_EMAIL", "dr.finance@iipe.ac.in"));
        dto.setEmployerPAN(getSettingOrDefault("FORM16_EMPLOYER_PAN", "AABAI0046C"));
        dto.setEmployerTAN(getSettingOrDefault("FORM16_EMPLOYER_TAN", "VPNI00723C"));
        dto.setCitTds(getSettingOrDefault("FORM16_CIT_TDS", "The Commissioner of Income Tax (TDS)\nHyderabad - 500004"));
        dto.setCertificateNo("");

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd-MMM-yyyy", Locale.ENGLISH);
        String currentDateStr = LocalDate.now().format(dtf);
        dto.setLastUpdatedOn(getSettingOrDefault("FORM16_LAST_UPDATED", currentDateStr));
        dto.setIssueDate(getSettingOrDefault("FORM16_ISSUE_DATE", currentDateStr));

        // Format Employee Name with Title
        String rawFirst = user.getFirstName() != null ? user.getFirstName() : "";
        String rawLast = user.getLastName() != null ? user.getLastName() : "";
        String rawName = (rawFirst + " " + rawLast).trim();
        if (rawName.isEmpty()) rawName = user.getName() != null ? user.getName() : user.getEmployeeId();

        String eid = user.getEmployeeId() != null ? user.getEmployeeId().toUpperCase().trim() : "";
        String desig = user.getDesignation() != null ? user.getDesignation().toUpperCase() : "";
        String dept = user.getDepartment() != null ? user.getDepartment().toUpperCase() : "";
        String et = user.getEmployeeType() != null ? user.getEmployeeType().toUpperCase() : "";
        String fn = user.getFunction() != null ? user.getFunction().toUpperCase() : "";

        boolean isAcademic = eid.startsWith("TS") || (eid.startsWith("CT") && !eid.startsWith("CNT")) ||
                desig.contains("PROFESSOR") || desig.contains("FACULTY") || desig.contains("LECTURER") ||
                dept.contains("ENGINEERING") || dept.contains("SCIENCES") || dept.equals("FACULTY") || dept.equals("ACADEMIC") ||
                et.contains("TEACHING") || fn.contains("TEACHING");

        String cleanName = rawName.replaceAll("(?i)^(dr\\.?|prof\\.?|professor|mr\\.?|shri\\.?|ms\\.?|mrs\\.?|smt\\.?)\\s+", "").trim();
        String prefix = isAcademic ? "Dr. " : "Mr. ";
        String formattedEmpName = prefix + cleanName;

        dto.setEmployeeName(formattedEmpName);
        dto.setEmployeePAN(user.getPan() != null && !user.getPan().isEmpty() ? user.getPan() : "ASKPY8597N");
        dto.setEmployeeId(user.getEmployeeId() != null ? user.getEmployeeId() : "NT1005");
        dto.setEmployeeAddress(""); // Address omitted per client requirement
        dto.setAssessmentYear(assessmentYear);
        dto.setFinancialYear(financialYear);
        dto.setPeriodFrom(periodFrom);
        dto.setPeriodTo(periodTo);

        // Signatory details from settings (default blank)
        dto.setSignatoryName(getSettingOrDefault("FORM16_SIGNATORY_NAME", ""));
        dto.setSignatoryFatherName(getSettingOrDefault("FORM16_SIGNATORY_FATHER_NAME", ""));
        dto.setSignatoryDesignation(getSettingOrDefault("FORM16_SIGNATORY_DESIGNATION", ""));
        dto.setPlace(getSettingOrDefault("FORM16_PLACE", "Visakhapatnam"));

        return dto;
    }
}
