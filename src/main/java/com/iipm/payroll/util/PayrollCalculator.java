package com.iipm.payroll.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Map;

/**
 * 7th CPC Payroll Calculator for IIPM Visakhapatnam
 *
 * Key Formulas:
 *  DA  = Basic × DA%
 *  HRA = Basic × 20%
 *  TA  = Level-based (Level 1-9: ₹1800 base; Level 10-17: ₹3600 base) + 60% of that base
 *  NPS Employee = (Basic + DA) × 10%
 *  NPS Employer = (Basic + DA) × 14%
 *  Gross = Basic + DA + HRA + TA
 *  Net   = Gross - (PT + TDS + NPS_Employee + CGHS + OtherDeductions)
 */
@Slf4j
@Component
public class PayrollCalculator {

    private static final int SCALE = 2;
    private static final RoundingMode ROUNDING_MODE = RoundingMode.HALF_UP;

    // Defaults — overridden by MongoDB settings at runtime
    private double daPercentage          = 62.0;  // DA as of 2026 (Jan 2026 revision)
    private double hraPercentage         = 20.0;  // X-class cities HRA
    private double npsEmployeePercentage = 10.0;  // NPS: Employee 10% of (Basic+DA)
    private double npsEmployerPercentage = 14.0;  // NPS: Employer 14% of (Basic+DA)
    private double ptAmount              = 200.0; // Professional Tax fixed
    private double cghsAmount           = 0.0; // CGHS deduction
    private double taLowerBase          = 1800.0; // TA base Level 1-9
    private double taHigherBase         = 3600.0; // TA base Level 10-17
    private double taDAPercentage       = 62.0;   // TA DA portion

    /* ============================================================
       MAIN CALCULATION METHOD (with pay level for TA)
       ============================================================ */
    public Map<String, Object> calculateMonthlySalary(double basicPay, String payLevel,
                                                       double tds, double otherDeductions,
                                                       Map<String, Double> settings) {
        Map<String, Object> result = new HashMap<>();
        try {
            updateConfiguration(settings);

            boolean isContract = payLevel != null && (
                payLevel.equalsIgnoreCase("Consolidated") ||
                payLevel.equalsIgnoreCase("Contract") ||
                payLevel.equalsIgnoreCase("Fixed")
            );

            boolean isDirector = payLevel != null && (
                payLevel.equalsIgnoreCase("Level-17") ||
                payLevel.equalsIgnoreCase("17")
            );

            double da = 0.0;
            double hra = 0.0;
            double ta = 0.0;
            double npsEmployeeShare = 0.0;
            double npsEmployerShare = 0.0;
            double professionalTax = (basicPay >= 20000 ? ptAmount : 0.0);
            double cghs = 0.0;
            double grossSalary = basicPay;
            double totalDeductions = 0.0;
            double netSalary = 0.0;

            if (isContract) {
                grossSalary = basicPay;
                totalDeductions = professionalTax + tds + otherDeductions;
                netSalary = grossSalary - totalDeductions;
            } else if (isDirector) {
                da = calculateDA(basicPay);
                grossSalary = basicPay + da;
                cghs = 1000.0;
                totalDeductions = professionalTax + tds + cghs + otherDeductions;
                netSalary = grossSalary - totalDeductions;
            } else {
                da = calculateDA(basicPay);
                hra = calculateHRA(basicPay);
                ta = calculateTA(payLevel);
                npsEmployeeShare = calculateNPSEmployeeShare(basicPay, da);
                npsEmployerShare = calculateNPSEmployerShare(basicPay, da);
                grossSalary = basicPay + da + hra + ta + npsEmployerShare;
                cghs = calculateCGHS(payLevel);
                totalDeductions = professionalTax + tds + npsEmployeeShare + cghs + otherDeductions + npsEmployerShare;
                netSalary = grossSalary - totalDeductions;
            }

            result.put("basicPay",         roundToScale(basicPay));
            result.put("da",               roundToScale(da));
            result.put("hra",              roundToScale(hra));
            result.put("ta",               roundToScale(ta));
            result.put("npsEmployerShare", roundToScale(npsEmployerShare));
            result.put("grossSalary",      roundToScale(grossSalary));
            result.put("professionalTax",  roundToScale(professionalTax));
            result.put("tds",              roundToScale(tds));
            result.put("npsEmployeeShare", roundToScale(npsEmployeeShare));
            result.put("cghs",             roundToScale(cghs));
            result.put("otherDeductions",  roundToScale(otherDeductions));
            result.put("totalDeductions",  roundToScale(totalDeductions));
            result.put("netSalary",        roundToScale(netSalary));
            result.put("success",          true);

            log.info("Salary calc: Basic={} DA={} HRA={} TA={} Level={} Gross={} Net={}",
                     basicPay, da, hra, ta, payLevel, grossSalary, netSalary);
        } catch (Exception e) {
            log.error("Error calculating salary", e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        return result;
    }

    /** Backward-compatible overload — defaults to Level 10 */
    public Map<String, Object> calculateMonthlySalary(double basicPay, double tds,
                                                       double otherDeductions,
                                                       Map<String, Double> settings) {
        return calculateMonthlySalary(basicPay, "10", tds, otherDeductions, settings);
    }

    /* ============================================================
       INDIVIDUAL COMPONENT CALCULATORS
       ============================================================ */

    /** DA = Basic × DA% */
    public double calculateDA(double basicPay) {
        return roundToScale(basicPay * daPercentage / 100.0);
    }

    /** HRA = Basic × 20% */
    public double calculateHRA(double basicPay) {
        return roundToScale(basicPay * hraPercentage / 100.0);
    }

    /**
     * TA — 7th CPC Level-based:
     *   Level 1–9  → ₹1,800 + (₹1,800 × DA%)
     *   Level 10–17 → ₹3,600 + (₹3,600 × DA%)
     */
    public double calculateTA(String payLevel) {
        int level = parseLevelNumber(payLevel);
        double base = (level >= 10) ? taHigherBase : taLowerBase;
        return roundToScale(base + (base * daPercentage / 100.0));
    }

    /** CGHS Deduction based on Pay Level */
    public double calculateCGHS(String payLevel) {
        if (payLevel == null || payLevel.isBlank()) return 250.0;
        if (payLevel.equalsIgnoreCase("Consolidated") ||
            payLevel.equalsIgnoreCase("Contract") ||
            payLevel.equalsIgnoreCase("Fixed")) {
            return 0.0;
        }
        int level = parseLevelNumber(payLevel);
        if (level >= 12) return 1000.0;
        if (level >= 7) return 650.0;
        if (level == 6) return 450.0;
        return 250.0;
    }

    /** NPS Employee Share = (Basic + DA) × 10% */
    public double calculateNPSEmployeeShare(double basicPay, double da) {
        return roundToScale((basicPay + da) * npsEmployeePercentage / 100.0);
    }

    /** NPS Employer Share = (Basic + DA) × 14% */
    public double calculateNPSEmployerShare(double basicPay, double da) {
        return roundToScale((basicPay + da) * npsEmployerPercentage / 100.0);
    }

    /* ============================================================
       ARREAR CALCULATORS
       ============================================================ */

    /** DA Arrears = (NewDA% − OldDA%) / 100 × Basic × Months */
    public double calculateDAArrays(double basicPay, double oldDAPercentage, double newDAPercentage, int months) {
        double diff = (newDAPercentage - oldDAPercentage) / 100.0;
        return roundToScale(basicPay * diff * months);
    }

    /** TA Arrears proportional to DA arrears */
    public double calculateTAArrays(double daArrears) {
        return roundToScale(daArrears * daPercentage / 100.0);
    }

    /** Promotion Arrears = (NewPay − OldPay) × (DaysWorked / TotalDays) */
    public double calculatePromotionArrears(double oldPay, double newPay, int daysWorked, int totalDays) {
        if (totalDays == 0) return 0;
        return roundToScale((newPay - oldPay) * ((double) daysWorked / totalDays));
    }

    /** Arrear Deductions */
    public Map<String, Double> calculateArrearDeductions(double grossAmount, double otherDeductions, Map<String, Double> settings) {
        updateConfiguration(settings);
        Map<String, Double> result = new HashMap<>();
        
        double pt = ptAmount;
        double cghs = 0.0; // Typically not deducted again on arrears
        double npsEmployee = roundToScale(grossAmount * npsEmployeePercentage / 100.0);
        double tds = roundToScale(grossAmount * 0.1); 
        
        double total = pt + cghs + npsEmployee + tds + otherDeductions;
        result.put("professionalTax", pt);
        result.put("cghs", cghs);
        result.put("npsEmployeeShare", npsEmployee);
        result.put("tds", tds);
        result.put("totalDeductions", total);
        
        return result;
    }

    /* ============================================================
       7th CPC PAY MATRIX LOOKUP
       ============================================================ */

    /**
     * Look up basic pay from 7th CPC Pay Matrix by Level + Index.
     * In production this data also lives in the pay_matrix MongoDB collection.
     */
    public double getBasicPayFromMatrix(int level, int index) {
        // Representative values per level (Level 1–17, Index 1–40)
        double[][] matrixFirstFive = {
            // Level 1
            {18000, 18500, 19100, 19700, 20300, 20900, 21500, 22100, 22800, 23500,
             24200, 24900, 25600, 26400, 27200, 28000, 28800, 29700, 30600, 31500,
             32500, 33500, 34500, 35600, 36700, 37800, 38900, 40100, 41300, 42500,
             43800, 45100, 46500, 47900, 49300, 50800, 52300, 53900, 55500, 57200},
            // Level 2
            {19900, 20500, 21100, 21700, 22400, 23100, 23800, 24500, 25200, 26000,
             26800, 27600, 28400, 29300, 30200, 31100, 32000, 33000, 34000, 35000,
             36100, 37200, 38300, 39400, 40600, 41800, 43100, 44400, 45700, 47100,
             48500, 50000, 51500, 53000, 54600, 56200, 57900, 59600, 61400, 63200},
            // Level 3
            {21700, 22400, 23100, 23800, 24500, 25200, 26000, 26800, 27600, 28400,
             29300, 30200, 31100, 32000, 33000, 34000, 35000, 36100, 37200, 38300,
             39400, 40600, 41800, 43100, 44400, 45700, 47100, 48500, 50000, 51500,
             53000, 54600, 56200, 57900, 59600, 61400, 63200, 65100, 67100, 69100},
            // Level 4
            {25500, 26300, 27100, 27900, 28700, 29600, 30500, 31400, 32300, 33300,
             34300, 35300, 36400, 37500, 38600, 39800, 41000, 42200, 43500, 44800,
             46100, 47500, 48900, 50400, 51900, 53500, 55100, 56800, 58500, 60300,
             62100, 64000, 65900, 67900, 69900, 72000, 74200, 76400, 78700, 81100},
            // Level 5
            {29200, 30100, 31000, 31900, 32900, 33900, 34900, 36000, 37100, 38200,
             39400, 40600, 41800, 43100, 44400, 45700, 47100, 48500, 50000, 51500,
             53000, 54600, 56200, 57900, 59600, 61400, 63200, 65100, 67100, 69100,
             71200, 73300, 75500, 77800, 80100, 82500, 85000, 87600, 90200, 92900},
            // Level 6
            {35400, 36500, 37600, 38700, 39900, 41100, 42300, 43600, 44900, 46300,
             47700, 49100, 50600, 52100, 53700, 55300, 57000, 58700, 60500, 62300,
             64200, 66100, 68100, 70100, 72200, 74400, 76600, 78900, 81300, 83700,
             86200, 88800, 91500, 94200, 97000, 99900, 102900, 106000, 109200, 112500},
            // Level 7
            {44900, 46200, 47600, 49000, 50500, 52000, 53600, 55200, 56900, 58600,
             60400, 62200, 64100, 66000, 68000, 70000, 72100, 74300, 76500, 78800,
             81200, 83600, 86100, 88700, 91400, 94100, 96900, 99800, 102800, 105900,
             109100, 112400, 115800, 119300, 122900, 126600, 130400, 134300, 138300, 142400},
            // Level 8
            {47600, 49000, 50500, 52000, 53600, 55200, 56900, 58600, 60400, 62200,
             64100, 66000, 68000, 70000, 72100, 74300, 76500, 78800, 81200, 83600,
             86100, 88700, 91400, 94100, 96900, 99800, 102800, 105900, 109100, 112400,
             115800, 119300, 122900, 126600, 130400, 134300, 138300, 142400, 146700, 151100},
            // Level 9
            {53100, 54700, 56300, 58000, 59700, 61500, 63300, 65200, 67200, 69200,
             71300, 73400, 75600, 77900, 80200, 82600, 85100, 87700, 90300, 93000,
             95800, 98700, 101700, 104800, 107900, 111100, 114400, 117800, 121300, 124900,
             128700, 132600, 136600, 140700, 144900, 149300, 153800, 158400, 163200, 168100},
            // Level 10
            {56100, 57800, 59500, 61300, 63100, 65000, 67000, 69000, 71100, 73200,
             75400, 77700, 80000, 82400, 84900, 87400, 90000, 92700, 95500, 98400,
             101400, 104400, 107500, 110700, 114000, 117400, 120900, 124500, 128200, 132000,
             136000, 140100, 144300, 148600, 153100, 157700, 162400, 167300, 172300, 177500},
            // Level 11
            {67700, 69700, 71800, 73900, 76100, 78400, 80800, 83200, 85700, 88300,
             91000, 93700, 96500, 99400, 102400, 105500, 108700, 111900, 115300, 118800,
             122400, 126100, 129900, 133800, 137800, 141900, 146200, 150600, 155100, 159800,
             164600, 169500, 174600, 179800, 185200, 190800, 196500, 202400, 208500, 214800},
            // Level 12
            {78800, 81200, 83600, 86100, 88700, 91400, 94100, 96900, 99800, 102800,
             105900, 109100, 112400, 115800, 119300, 122900, 126600, 130400, 134300, 138300,
             142400, 146700, 151100, 155600, 160300, 165100, 170100, 175200, 180500, 185900,
             191500, 197200, 203100, 209200, 215500, 221900, 228600, 235500, 242600, 249900},
            // Level 13
            {123100, 126800, 130600, 134500, 138500, 142700, 147000, 151400, 155900, 160600,
             165400, 170400, 175500, 180900, 186300, 191900, 197700, 203600, 209700, 216000,
             222500, 229200, 236100, 243200, 250500, 258000, 265700, 273700, 281900, 290400,
             290400, 290400, 290400, 290400, 290400, 290400, 290400, 290400, 290400, 290400},
            // Level 14
            {144200, 148500, 153000, 157600, 162300, 167200, 172200, 177400, 182700, 188200,
             193800, 199600, 205600, 211800, 218200, 224700, 231400, 238300, 245500, 252900,
             260500, 268300, 276300, 284600, 293100, 302000, 311100, 320400, 330000, 340000,
             340000, 340000, 340000, 340000, 340000, 340000, 340000, 340000, 340000, 340000},
            // Level 15
            {182200, 187700, 193300, 199100, 205100, 211300, 217600, 224100, 230800, 237700,
             244800, 252100, 259700, 267500, 275500, 283800, 292300, 301100, 310100, 319400,
             329000, 338900, 349100, 359600, 370400, 381500, 393000, 404800, 417000, 429500,
             429500, 429500, 429500, 429500, 429500, 429500, 429500, 429500, 429500, 429500},
            // Level 16
            {205400, 211600, 217900, 224400, 231100, 238000, 245100, 252500, 260100, 268000,
             276000, 284300, 292800, 301600, 310600, 320000, 329600, 339500, 349700, 360200,
             371000, 382100, 393600, 405400, 417600, 430100, 443000, 456300, 470000, 484100,
             484100, 484100, 484100, 484100, 484100, 484100, 484100, 484100, 484100, 484100},
            // Level 17
            {225000, 231800, 238700, 245900, 253300, 260900, 268700, 276800, 285100, 293700,
             302500, 311600, 321000, 330600, 340500, 350700, 361200, 372000, 383200, 394700,
             406500, 418700, 431300, 444200, 457500, 471200, 485300, 499900, 515000, 530500,
             530500, 530500, 530500, 530500, 530500, 530500, 530500, 530500, 530500, 530500}
        };

        if (level < 1 || level > 17) return 18000;
        int levelIdx = level - 1;
        double[] row = matrixFirstFive[levelIdx];
        int idx = Math.max(0, Math.min(index - 1, row.length - 1));
        return row[idx];
    }

    /* ============================================================
       HELPERS
       ============================================================ */

    private int parseLevelNumber(String payLevel) {
        if (payLevel == null || payLevel.isBlank()) return 10;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(\\d+)").matcher(payLevel);
        if (m.find()) {
            try { return Integer.parseInt(m.group(1)); }
            catch (Exception e) {}
        }
        return 10;
    }

    private void updateConfiguration(Map<String, Double> settings) {
        if (settings == null) return;
        if (settings.containsKey("DA_PERCENTAGE"))          this.daPercentage          = settings.get("DA_PERCENTAGE");
        if (settings.containsKey("HRA_PERCENTAGE"))         this.hraPercentage         = settings.get("HRA_PERCENTAGE");
        if (settings.containsKey("NPS_EMPLOYEE_PERCENTAGE"))this.npsEmployeePercentage = settings.get("NPS_EMPLOYEE_PERCENTAGE");
        if (settings.containsKey("NPS_EMPLOYER_PERCENTAGE"))this.npsEmployerPercentage = settings.get("NPS_EMPLOYER_PERCENTAGE");
        if (settings.containsKey("PT_AMOUNT"))              this.ptAmount              = settings.get("PT_AMOUNT");
        if (settings.containsKey("CGHS_AMOUNT"))            this.cghsAmount            = settings.get("CGHS_AMOUNT");
        if (settings.containsKey("TA_LOWER_BASE"))          this.taLowerBase           = settings.get("TA_LOWER_BASE");
        if (settings.containsKey("TA_HIGHER_BASE"))         this.taHigherBase          = settings.get("TA_HIGHER_BASE");
        if (settings.containsKey("TA_DA_PERCENTAGE"))       this.taDAPercentage        = settings.get("TA_DA_PERCENTAGE");
    }

    private double roundToScale(double value) {
        return new BigDecimal(value).setScale(SCALE, ROUNDING_MODE).doubleValue();
    }

    // Getters/Setters
    public double getDaPercentage() { return daPercentage; }
    public void setDaPercentage(double v) { this.daPercentage = v; }
    public double getHraPercentage() { return hraPercentage; }
    public void setHraPercentage(double v) { this.hraPercentage = v; }
    public double getNpsEmployeePercentage() { return npsEmployeePercentage; }
    public void setNpsEmployeePercentage(double v) { this.npsEmployeePercentage = v; }
    public double getNpsEmployerPercentage() { return npsEmployerPercentage; }
    public void setNpsEmployerPercentage(double v) { this.npsEmployerPercentage = v; }
}
