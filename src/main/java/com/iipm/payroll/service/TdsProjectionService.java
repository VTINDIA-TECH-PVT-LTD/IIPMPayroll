package com.iipm.payroll.service;

import com.iipm.payroll.dto.TdsProjectionDTO;
import com.iipm.payroll.model.ItDeclaration;
import com.iipm.payroll.model.Payroll;
import com.iipm.payroll.model.User;
import com.iipm.payroll.repository.PayrollRepository;
import com.iipm.payroll.repository.UserRepository;
import com.iipm.payroll.util.PayrollCalculator;
import com.iipm.payroll.util.TaxCalculator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Month;
import java.time.format.TextStyle;
import java.util.*;

@Slf4j
@Service
public class TdsProjectionService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PayrollRepository payrollRepository;

    @Autowired
    private ItDeclarationService itDeclarationService;

    @Autowired
    private PayrollCalculator payrollCalculator;

    @Autowired
    private TaxCalculator taxCalculator;

    public TdsProjectionDTO calculateTdsProjection(String userId, int startYear) {
        User user = userRepository.findById(userId)
                .orElseGet(() -> userRepository.findByEmployeeId(userId)
                        .orElseThrow(() -> new RuntimeException("User not found: " + userId)));

        String financialYear = startYear + "-" + (startYear + 1);
        ItDeclaration declaration = itDeclarationService.getByUserIdAndFinancialYear(user.getId(), financialYear).orElse(null);
        String regime = (declaration != null && declaration.getTaxRegime() != null) ? declaration.getTaxRegime().toUpperCase() : "NEW";

        // 1. Fetch actual payrolls in FY (April startYear to March startYear+1)
        List<Payroll> fyPayrolls = new ArrayList<>();
        // Months 4-12 in startYear
        for (int m = 4; m <= 12; m++) {
            Optional<Payroll> pOpt = payrollRepository.findByUserIdAndMonthAndYear(user.getId(), m, startYear);
            if (pOpt.isEmpty() && user.getEmployeeId() != null) {
                pOpt = payrollRepository.findByUserIdAndMonthAndYear(user.getEmployeeId(), m, startYear);
            }
            pOpt.ifPresent(fyPayrolls::add);
        }
        // Months 1-3 in startYear + 1
        for (int m = 1; m <= 3; m++) {
            Optional<Payroll> pOpt = payrollRepository.findByUserIdAndMonthAndYear(user.getId(), m, startYear + 1);
            if (pOpt.isEmpty() && user.getEmployeeId() != null) {
                pOpt = payrollRepository.findByUserIdAndMonthAndYear(user.getEmployeeId(), m, startYear + 1);
            }
            pOpt.ifPresent(fyPayrolls::add);
        }

        // 2. Base salary & monthly estimations
        double basic = user.getBasicPay() != null ? user.getBasicPay() : 0.0;
        double da = payrollCalculator.calculateDA(basic);
        double hra = payrollCalculator.calculateHRA(basic);
        double ta = payrollCalculator.calculateTA(user.getPayLevel() != null ? user.getPayLevel() : "10");
        double dean = user.getDeanAllowance() != null ? user.getDeanAllowance()
                : (user.getSpecialAllowance() != null ? user.getSpecialAllowance() : 0.0);
        double monthlyNpsEmployer = (basic + da) * 0.14;
        double standardMonthlyGross = basic + da + hra + ta + dean + monthlyNpsEmployer;

        // 3. Compute actual totals and projected annual gross
        double actualGrossSoFar = 0.0;
        double actualTdsSoFar = 0.0;
        Map<String, Payroll> monthPayrollMap = new HashMap<>();

        for (Payroll p : fyPayrolls) {
            String key = p.getMonth() + "_" + p.getYear();
            monthPayrollMap.put(key, p);
            actualGrossSoFar += p.getGrossSalary();
            actualTdsSoFar += p.getTds();
        }

        int monthsDeducted = fyPayrolls.size();
        int monthsRemaining = Math.max(0, 12 - monthsDeducted);

        double projectedAnnualGross = actualGrossSoFar + (monthsRemaining * standardMonthlyGross);
        double annualNpsEmployer = (monthlyNpsEmployer * 12);
        double ptAnnual = 2400.0;
        double stdDeduction = "OLD".equals(regime) ? 50000.0 : 75000.0;

        double otherChapterVIA = 0.0;
        if ("OLD".equals(regime) && declaration != null) {
            double sec80C = Math.min(declaration.getSection80C(), 150000.0);
            double sec80D = declaration.getSection80D();
            double hraExempt = declaration.getHraExemption();
            double homeLoan = Math.min(declaration.getHomeLoanInterest(), 200000.0);
            otherChapterVIA = sec80C + sec80D + hraExempt + homeLoan;
        }

        double totalDeductions = stdDeduction + annualNpsEmployer + ptAnnual + otherChapterVIA;
        double netTaxableIncome = Math.max(0.0, projectedAnnualGross - totalDeductions);

        // 4. Tax Calculation
        double tax = 0.0;
        double rebate = 0.0;

        if ("NEW".equals(regime)) {
            if (netTaxableIncome > 300000) {
                if (netTaxableIncome > 300000) tax += (Math.min(netTaxableIncome, 700000) - 300000) * 0.05;
                if (netTaxableIncome > 700000) tax += (Math.min(netTaxableIncome, 1000000) - 700000) * 0.10;
                if (netTaxableIncome > 1000000) tax += (Math.min(netTaxableIncome, 1200000) - 1000000) * 0.15;
                if (netTaxableIncome > 1200000) tax += (Math.min(netTaxableIncome, 1500000) - 1200000) * 0.20;
                if (netTaxableIncome > 1500000) tax += (netTaxableIncome - 1500000) * 0.30;

                if (netTaxableIncome <= 700000) {
                    rebate = Math.min(tax, 25000.0);
                    tax -= rebate;
                }
            }
        } else {
            if (netTaxableIncome > 250000) {
                if (netTaxableIncome > 250000) tax += (Math.min(netTaxableIncome, 500000) - 250000) * 0.05;
                if (netTaxableIncome > 500000) tax += (Math.min(netTaxableIncome, 1000000) - 500000) * 0.20;
                if (netTaxableIncome > 1000000) tax += (netTaxableIncome - 1000000) * 0.30;

                if (netTaxableIncome <= 500000) {
                    rebate = Math.min(tax, 12500.0);
                    tax -= rebate;
                }
            }
        }

        double cess = tax > 0 ? tax * 0.04 : 0.0;
        double estimatedAnnualTax = Math.round(tax + cess);

        // 5. Remaining Balance & Monthly TDS for Next Months
        double tdsRemaining = Math.max(0.0, estimatedAnnualTax - actualTdsSoFar);
        double monthlyTdsNext = monthsRemaining > 0 ? Math.round(tdsRemaining / monthsRemaining) : 0.0;
        // Round to nearest 10
        monthlyTdsNext = Math.round(monthlyTdsNext / 10.0) * 10.0;

        // 6. Build 12-Month Schedule (April to March)
        List<TdsProjectionDTO.MonthlyTdsItem> schedule = new ArrayList<>();
        double runningTds = 0.0;

        int[][] monthsSequence = new int[][]{
                {4, startYear}, {5, startYear}, {6, startYear}, {7, startYear},
                {8, startYear}, {9, startYear}, {10, startYear}, {11, startYear},
                {12, startYear}, {1, startYear + 1}, {2, startYear + 1}, {3, startYear + 1}
        };

        for (int[] my : monthsSequence) {
            int m = my[0];
            int y = my[1];
            String key = m + "_" + y;
            String monthName = Month.of(m).getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + y;

            if (monthPayrollMap.containsKey(key)) {
                Payroll p = monthPayrollMap.get(key);
                runningTds += p.getTds();
                schedule.add(TdsProjectionDTO.MonthlyTdsItem.builder()
                        .month(m)
                        .year(y)
                        .monthName(monthName)
                        .grossSalary(p.getGrossSalary())
                        .tdsAmount(p.getTds())
                        .status("DEDUCTED")
                        .cumulativeTds(runningTds)
                        .build());
            } else {
                runningTds += monthlyTdsNext;
                schedule.add(TdsProjectionDTO.MonthlyTdsItem.builder()
                        .month(m)
                        .year(y)
                        .monthName(monthName)
                        .grossSalary(standardMonthlyGross)
                        .tdsAmount(monthlyTdsNext)
                        .status("PROJECTED")
                        .cumulativeTds(runningTds)
                        .build());
            }
        }

        String empName = ((user.getFirstName() != null ? user.getFirstName() : "") +
                (user.getLastName() != null ? " " + user.getLastName() : "")).trim();
        if (empName.isEmpty()) empName = user.getUsername() != null ? user.getUsername() : user.getEmployeeId();

        return TdsProjectionDTO.builder()
                .userId(user.getId())
                .employeeId(user.getEmployeeId())
                .employeeName(empName)
                .designation(user.getDesignation() != null ? user.getDesignation() : "-")
                .department(user.getDepartment() != null ? user.getDepartment() : "-")
                .pan(user.getPan() != null ? user.getPan() : "-")
                .financialYear(financialYear)
                .taxRegime(regime)
                .projectedAnnualGross(projectedAnnualGross)
                .standardDeduction(stdDeduction)
                .deduction80CCD2(annualNpsEmployer)
                .professionalTax(ptAnnual)
                .otherChapterVIADeductions(otherChapterVIA)
                .totalDeductions(totalDeductions)
                .netTaxableIncome(netTaxableIncome)
                .taxOnIncome(tax)
                .rebate87A(rebate)
                .cess(cess)
                .estimatedAnnualTax(estimatedAnnualTax)
                .tdsDeductedSoFar(actualTdsSoFar)
                .tdsRemainingToBeDeducted(tdsRemaining)
                .monthsDeductedCount(monthsDeducted)
                .monthsRemainingCount(monthsRemaining)
                .monthlyTdsNextMonths(monthlyTdsNext)
                .monthlySchedule(schedule)
                .build();
    }

    public List<TdsProjectionDTO> calculateAllTdsProjections(int startYear) {
        List<User> users = userRepository.findAll();
        List<TdsProjectionDTO> list = new ArrayList<>();
        for (User u : users) {
            if (Boolean.TRUE.equals(u.getIsActive()) && u.getBasicPay() != null && u.getBasicPay() > 0) {
                try {
                    list.add(calculateTdsProjection(u.getId(), startYear));
                } catch (Exception e) {
                    log.error("Error computing TDS projection for user: {}", u.getUsername(), e);
                }
            }
        }
        return list;
    }
}
