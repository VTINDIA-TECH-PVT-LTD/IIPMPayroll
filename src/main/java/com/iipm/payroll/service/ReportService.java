package com.iipm.payroll.service;

import com.iipm.payroll.model.Payroll;
import com.iipm.payroll.model.User;
import com.iipm.payroll.repository.PayrollRepository;
import com.iipm.payroll.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Year;
import java.util.*;
import java.util.stream.Collectors;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Slf4j
@Service
public class ReportService {

    @Autowired
    private PayrollRepository payrollRepository;

    @Autowired
    private UserRepository userRepository;

    public Map<String, Object> getSalaryRegister(int month, int year) {
        List<Payroll> payrolls = payrollRepository.findByMonthAndYear(month, year);

        double totalGross = payrolls.stream().mapToDouble(Payroll::getGrossSalary).sum();
        double totalNet = payrolls.stream().mapToDouble(Payroll::getNetSalary).sum();
        double totalDeductions = payrolls.stream().mapToDouble(Payroll::getTotalDeductions).sum();

        return Map.of(
                "month", month,
                "year", year,
                "totalEmployees", payrolls.size(),
                "totalGross", totalGross,
                "totalDeductions", totalDeductions,
                "totalNet", totalNet,
                "payrolls", payrolls
        );
    }

    public byte[] exportSalaryRegister(int month, int year) throws IOException {
        List<Payroll> payrolls = payrollRepository.findByMonthAndYear(month, year);
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Salary Register " + month + "-" + year);
            Row headerRow = sheet.createRow(0);
            String[] headers = {"Employee ID", "Name", "Designation", "Basic Pay", "DA", "HRA", "Gross Salary", "NPS", "PF", "Tax", "Net Salary"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
            }

            int rowNum = 1;
            for (Payroll p : payrolls) {
                Row row = sheet.createRow(rowNum++);
                com.iipm.payroll.model.User user = userRepository.findById(p.getUserId()).orElse(null);
                row.createCell(0).setCellValue(user != null ? user.getEmployeeId() : p.getUserId());
                row.createCell(1).setCellValue(user != null ? user.getUsername() : p.getUserId());
                row.createCell(2).setCellValue(user != null ? user.getDesignation() : "");
                row.createCell(3).setCellValue(p.getBasicPay());
                row.createCell(4).setCellValue(p.getDa());
                row.createCell(5).setCellValue(p.getHra());
                row.createCell(6).setCellValue(p.getGrossSalary());
                row.createCell(7).setCellValue(p.getNpsEmployeeShare() + p.getNpsEmployerShare());
                row.createCell(8).setCellValue(p.getNpsEmployeeShare());
                row.createCell(9).setCellValue(p.getTds());
                row.createCell(10).setCellValue(p.getNetSalary());
            }

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }

    public Map<String, Object> getNPSReport(int year) {
        List<Payroll> payrolls = payrollRepository.findByStatusAndYearOrderByMonthDesc("APPROVED", year);

        double totalNPSEmployee = payrolls.stream().mapToDouble(Payroll::getNpsEmployeeShare).sum();
        double totalNPSEmployer = payrolls.stream().mapToDouble(Payroll::getNpsEmployerShare).sum();
        double totalNPS = totalNPSEmployee + totalNPSEmployer;

        return Map.of(
                "year", year,
                "totalNPSEmployee", totalNPSEmployee,
                "totalNPSEmployer", totalNPSEmployer,
                "totalNPS", totalNPS,
                "monthlyData", payrolls.stream()
                        .collect(Collectors.groupingBy(Payroll::getMonth,
                                Collectors.summingDouble(p -> p.getNpsEmployeeShare() + p.getNpsEmployerShare())))
        );
    }

    public Map<String, Object> getTDSReport(int year) {
        List<Payroll> payrolls = payrollRepository.findByStatusAndYearOrderByMonthDesc("APPROVED", year);

        double totalTDS = payrolls.stream().mapToDouble(Payroll::getTds).sum();

        Map<String, Double> monthlyTDS = payrolls.stream()
                .collect(Collectors.groupingBy(
                        p -> String.format("%02d", p.getMonth()),
                        Collectors.summingDouble(Payroll::getTds)
                ));

        return Map.of(
                "year", year,
                "totalTDS", totalTDS,
                "averageMonthlyTDS", totalTDS / 12,
                "monthlyTDS", monthlyTDS,
                "payrollCount", payrolls.size()
        );
    }

    public Map<String, Object> getYTDReport(String userId) {
        return getYTDReport(userId, Year.now().getValue());
    }

    public Map<String, Object> getYTDReport(String userId, int year) {
        List<Payroll> payrolls;
        String employeeName = "All Employees (Institute Consolidated)";
        String employeeId = "ALL";

        if (userId == null || userId.trim().isEmpty() || "all".equalsIgnoreCase(userId)) {
            payrolls = payrollRepository.findByYear(year);
        } else {
            payrolls = payrollRepository.findByUserIdOrEmployeeIdAndYear(userId, userId, year);
            if (payrolls.isEmpty()) {
                final String targetId = userId;
                User u = userRepository.findById(targetId)
                        .or(() -> userRepository.findByEmployeeId(targetId))
                        .orElse(null);
                if (u != null) {
                    payrolls = payrollRepository.findByUserIdOrEmployeeIdAndYear(u.getId(), u.getEmployeeId(), year);
                    employeeName = u.getName();
                    employeeId = u.getEmployeeId();
                }
            } else {
                Payroll first = payrolls.get(0);
                final String pUserId = first.getUserId();
                final String pEmpId = first.getEmployeeId();
                User u = (pUserId != null ? userRepository.findById(pUserId) : Optional.<User>empty())
                        .or(() -> pEmpId != null ? userRepository.findByEmployeeId(pEmpId) : Optional.empty())
                        .orElse(null);
                if (u != null) {
                    employeeName = u.getName();
                    employeeId = u.getEmployeeId();
                }
            }
        }

        double totalBasic = payrolls.stream().mapToDouble(Payroll::getBasicPay).sum();
        double totalDA = payrolls.stream().mapToDouble(Payroll::getDa).sum();
        double totalHRA = payrolls.stream().mapToDouble(Payroll::getHra).sum();
        double totalTA = payrolls.stream().mapToDouble(Payroll::getTa).sum();
        double totalOtherAllowances = payrolls.stream().mapToDouble(Payroll::getOtherAllowances).sum();
        double totalNpsEmployer = payrolls.stream().mapToDouble(Payroll::getNpsEmployerShare).sum();
        double totalGross = payrolls.stream().mapToDouble(Payroll::getGrossSalary).sum();

        double totalTDS = payrolls.stream().mapToDouble(Payroll::getTds).sum();
        double totalNPS = payrolls.stream().mapToDouble(p -> p.getNpsEmployeeShare()).sum();
        double totalPT = payrolls.stream().mapToDouble(Payroll::getProfessionalTax).sum();
        double totalCGHS = payrolls.stream().mapToDouble(Payroll::getCghs).sum();
        double totalOtherDeductions = payrolls.stream().mapToDouble(Payroll::getOtherDeductions).sum();
        double totalDeductions = payrolls.stream().mapToDouble(Payroll::getTotalDeductions).sum();
        double totalNet = payrolls.stream().mapToDouble(p -> p.getNetSalary() != null ? p.getNetSalary() : (p.getGrossSalary() - p.getTotalDeductions())).sum();

        // Calculate unique distinct months processed
        long distinctMonths = payrolls.stream().map(Payroll::getMonth).distinct().count();
        int monthsProcessed = (int) distinctMonths;
        if (monthsProcessed == 0 && !payrolls.isEmpty()) monthsProcessed = payrolls.size();

        double averageMonthly = monthsProcessed > 0 ? (totalGross / monthsProcessed) : 0;

        Map<String, Object> result = new HashMap<>();
        result.put("userId", userId);
        result.put("employeeName", employeeName);
        result.put("employeeId", employeeId);
        result.put("year", year);
        result.put("monthsProcessed", monthsProcessed);
        result.put("totalBasicPay", totalBasic);
        result.put("totalGrossSalary", totalGross);
        result.put("totalDA", totalDA);
        result.put("totalHRA", totalHRA);
        result.put("totalTA", totalTA);
        result.put("totalOtherAllowances", totalOtherAllowances);
        result.put("totalNpsEmployer", totalNpsEmployer);
        result.put("totalNPS", totalNPS);
        result.put("totalTDS", totalTDS);
        result.put("totalPT", totalPT);
        result.put("totalCGHS", totalCGHS);
        result.put("totalOtherDeductions", totalOtherDeductions);
        result.put("totalDeductions", totalDeductions);
        result.put("totalNetSalary", totalNet);
        result.put("averageMonthly", averageMonthly);

        return result;
    }

    public Map<String, Object> getSalaryComparison(String userId) {
        int currentYear = Year.now().getValue();
        int previousYear = currentYear - 1;

        List<Payroll> currentYearPayrolls = payrollRepository.findByUserIdAndYear(userId, currentYear);
        List<Payroll> previousYearPayrolls = payrollRepository.findByUserIdAndYear(userId, previousYear);

        double currentYearGross = currentYearPayrolls.stream().mapToDouble(Payroll::getGrossSalary).sum();
        double previousYearGross = previousYearPayrolls.stream().mapToDouble(Payroll::getGrossSalary).sum();

        double currentYearNet = currentYearPayrolls.stream().mapToDouble(Payroll::getNetSalary).sum();
        double previousYearNet = previousYearPayrolls.stream().mapToDouble(Payroll::getNetSalary).sum();

        double grossDifference = currentYearGross - previousYearGross;
        double grossPercentageChange = previousYearGross > 0 ? (grossDifference / previousYearGross) * 100 : 0;

        double netDifference = currentYearNet - previousYearNet;
        double netPercentageChange = previousYearNet > 0 ? (netDifference / previousYearNet) * 100 : 0;

        Map<String, Object> result = new HashMap<>();
        result.put("userId", userId);
        result.put("currentYear", currentYear);
        result.put("previousYear", previousYear);
        result.put("currentYearGross", currentYearGross);
        result.put("previousYearGross", previousYearGross);
        result.put("grossDifference", grossDifference);
        result.put("grossPercentageChange", String.format("%.2f%%", grossPercentageChange));
        result.put("currentYearNet", currentYearNet);
        result.put("previousYearNet", previousYearNet);
        result.put("netDifference", netDifference);
        result.put("netPercentageChange", String.format("%.2f%%", netPercentageChange));

        return result;
    }

    public Map<String, Object> getMonthlyTrendReport(String userId, int year) {
        List<Payroll> payrolls = payrollRepository.findByUserIdAndYear(userId, year);

        Map<Integer, Map<String, Object>> monthlyTrend = new TreeMap<>();

        for (Payroll payroll : payrolls) {
            Map<String, Object> monthData = Map.of(
                    "month", payroll.getMonth(),
                    "basicPay", payroll.getBasicPay(),
                    "da", payroll.getDa(),
                    "hra", payroll.getHra(),
                    "ta", payroll.getTa(),
                    "gross", payroll.getGrossSalary(),
                    "deductions", payroll.getTotalDeductions(),
                    "net", payroll.getNetSalary()
            );
            monthlyTrend.put(payroll.getMonth(), monthData);
        }

        return Map.of(
                "userId", userId,
                "year", year,
                "monthlyData", monthlyTrend
        );
    }

    public Map<String, Object> getDepartmentWiseReport(int month, int year) {
        List<Payroll> payrolls = payrollRepository.findByMonthAndYear(month, year);

        Map<String, Map<String, Object>> departmentWise = payrolls.stream()
                .collect(Collectors.groupingBy(
                        p -> userRepository.findById(p.getUserId()).map(u -> u.getDepartment()).orElse("Unknown"),
                        Collectors.collectingAndThen(
                                Collectors.toList(),
                                list -> {
                                    double totalGross = list.stream().mapToDouble(Payroll::getGrossSalary).sum();
                                    double totalNet = list.stream().mapToDouble(Payroll::getNetSalary).sum();
                                    return Map.of(
                                            "employeeCount", (Object) list.size(),
                                            "totalGross", totalGross,
                                            "totalNet", totalNet,
                                            "averageGross", totalGross / list.size()
                                    );
                                }
                        )
                ));

        return Map.of(
                "month", month,
                "year", year,
                "departments", departmentWise
        );
    }

    public Map<String, Object> getPayrollStatistics(int year) {
        List<Payroll> payrolls = payrollRepository.findByStatusAndYearOrderByMonthDesc("APPROVED", year);

        double averageGross = payrolls.stream().mapToDouble(Payroll::getGrossSalary).average().orElse(0);
        double averageNet = payrolls.stream().mapToDouble(Payroll::getNetSalary).average().orElse(0);
        double minGross = payrolls.stream().mapToDouble(Payroll::getGrossSalary).min().orElse(0);
        double maxGross = payrolls.stream().mapToDouble(Payroll::getGrossSalary).max().orElse(0);

        Map<Integer, Double> monthlyCosts = payrolls.stream()
                .collect(Collectors.groupingBy(Payroll::getMonth, Collectors.summingDouble(Payroll::getNetSalary)));

        return Map.of(
                "year", year,
                "totalPayrolls", payrolls.size(),
                "averageGross", averageGross,
                "averageNet", averageNet,
                "minGross", minGross,
                "maxGross", maxGross,
                "totalGross", payrolls.stream().mapToDouble(Payroll::getGrossSalary).sum(),
                "totalNet", payrolls.stream().mapToDouble(Payroll::getNetSalary).sum(),
                "monthlyCosts", monthlyCosts
        );
    }
}
