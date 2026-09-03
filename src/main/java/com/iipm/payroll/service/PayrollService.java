package com.iipm.payroll.service;

import com.iipm.payroll.model.Payroll;
import com.iipm.payroll.model.User;
import com.iipm.payroll.repository.PayrollRepository;
import com.iipm.payroll.repository.UserRepository;
import com.iipm.payroll.util.PayrollCalculator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
public class PayrollService {

    @Autowired
    private PayrollRepository payrollRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PayrollCalculator payrollCalculator;

    @Autowired
    private SettingService settingService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ItDeclarationService itDeclarationService;

    @Autowired
    private com.iipm.payroll.util.TaxCalculator taxCalculator;

    public Payroll createPayroll(String userId, int month, int year, double tds, double otherDeductions, String createdBy) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check if payroll already exists for this month/year
        Optional<Payroll> existing = payrollRepository.findByUserIdAndMonthAndYear(userId, month, year);
        if (existing.isPresent()) {
            throw new RuntimeException("Payroll already exists for " + month + "/" + year);
        }

        // Get all settings
        Map<String, Double> settings = settingService.getAllPayrollSettings();

        // Calculate salary (pass payLevel for level-based TA calculation)
        Map<String, Object> calculation = payrollCalculator.calculateMonthlySalary(
                user.getBasicPay() != null ? user.getBasicPay() : 0,
                user.getPayLevel() != null ? user.getPayLevel() : "10",
                tds,
                otherDeductions,
                settings
        );

        // Create payroll record
        Payroll payroll = Payroll.builder()
                .userId(userId)
                .employeeId(user.getEmployeeId())
                .month(month)
                .year(year)
                .basicPay(((Number) calculation.get("basicPay")).doubleValue())
                .da(((Number) calculation.get("da")).doubleValue())
                .hra(((Number) calculation.get("hra")).doubleValue())
                .ta(((Number) calculation.get("ta")).doubleValue())
                .npsEmployerShare(((Number) calculation.get("npsEmployerShare")).doubleValue())
                .grossSalary(((Number) calculation.get("grossSalary")).doubleValue())
                .tds(((Number) calculation.get("tds")).doubleValue())
                .professionalTax(((Number) calculation.get("professionalTax")).doubleValue())
                .npsEmployeeShare(((Number) calculation.get("npsEmployeeShare")).doubleValue())
                .cghs(((Number) calculation.get("cghs")).doubleValue())
                .otherDeductions(((Number) calculation.get("otherDeductions")).doubleValue())
                .totalDeductions(((Number) calculation.get("totalDeductions")).doubleValue())
                .netSalary(((Number) calculation.get("netSalary")).doubleValue())
                .status("DRAFT")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .createdBy(createdBy)
                .updatedBy(createdBy)
                .build();

        Payroll saved = payrollRepository.save(payroll);
        log.info("Payroll created for user {} (Month: {}/{})", user.getUsername(), month, year);

        // Notify payroll officer
        notificationService.createNotification(userId, "PAYROLL_READY",
                "Payroll Ready",
                "Payroll for " + month + "/" + year + " is ready for review",
                "HIGH");

        return saved;
    }

    public Payroll getPayrollById(String id) {
        return payrollRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payroll not found"));
    }

    public Payroll getPayrollByUserAndMonth(String userId, int month, int year) {
        return payrollRepository.findByUserIdAndMonthAndYear(userId, month, year)
                .orElseThrow(() -> new RuntimeException("Payroll not found for " + month + "/" + year));
    }

    public List<Payroll> getPayrollsByUser(String userId) {
        return payrollRepository.findByUserIdOrderByYearDescMonthDesc(userId);
    }

    public List<Payroll> getPayrollsByMonth(int month, int year) {
        return payrollRepository.findByMonthAndYear(month, year);
    }

    public List<Payroll> getPayrollsByStatus(String status) {
        return payrollRepository.findByStatus(status);
    }

    public Payroll approvePayroll(String payrollId, String approvedBy) {
        Payroll payroll = getPayrollById(payrollId);

        payroll.setStatus("APPROVED");
        payroll.setApprovedBy(approvedBy);
        payroll.setApprovedAt(LocalDateTime.now());
        payroll.setUpdatedAt(LocalDateTime.now());

        Payroll updated = payrollRepository.save(payroll);
        log.info("Payroll approved: {}", payrollId);

        // Notify employee
        notificationService.createNotification(payroll.getUserId(), "PAYROLL_APPROVED",
                "Payroll Approved",
                "Your payroll for " + payroll.getMonth() + "/" + payroll.getYear() + " has been approved",
                "HIGH");

        return updated;
    }

    public Payroll rejectPayroll(String payrollId, String rejectionReason, String updatedBy, List<String> attachments) {
        Payroll payroll = getPayrollById(payrollId);

        payroll.setStatus("REJECTED");
        payroll.setRejectionReason(rejectionReason);
        if (attachments != null && !attachments.isEmpty()) {
            payroll.setAttachments(attachments);
        }
        payroll.setUpdatedAt(LocalDateTime.now());
        payroll.setUpdatedBy(updatedBy);

        Payroll updated = payrollRepository.save(payroll);
        log.info("Payroll rejected: {}", payrollId);

        // Notify employee
        notificationService.createNotification(payroll.getUserId(), "PAYROLL_REJECTED",
                "Payroll Rejected",
                "Your payroll for " + payroll.getMonth() + "/" + payroll.getYear() + " was rejected: " + rejectionReason,
                "HIGH");

        return updated;
    }

    public Payroll lockPayroll(String payrollId, String lockedBy) {
        Payroll payroll = getPayrollById(payrollId);

        if (!payroll.getStatus().equals("APPROVED")) {
            throw new RuntimeException("Only approved payroll can be locked");
        }

        payroll.setStatus("LOCKED");
        payroll.setUpdatedAt(LocalDateTime.now());
        payroll.setUpdatedBy(lockedBy);

        Payroll updated = payrollRepository.save(payroll);
        log.info("Payroll locked: {}", payrollId);

        return updated;
    }

    public List<Payroll> approveBulkPayroll(List<String> ids, String approvedBy) {
        return ids.stream().map(id -> approvePayroll(id, approvedBy)).collect(java.util.stream.Collectors.toList());
    }

    public List<Payroll> rejectBulkPayroll(List<String> ids, String reason, String updatedBy) {
        return ids.stream().map(id -> rejectPayroll(id, reason, updatedBy, null)).collect(java.util.stream.Collectors.toList());
    }

    public List<Payroll> getPayrollsByYear(String userId, int year) {
        return payrollRepository.findByUserIdAndYear(userId, year);
    }

    public double getAnnualSalary(String userId, int year) {
        List<Payroll> payrolls = getPayrollsByYear(userId, year);
        return payrolls.stream()
                .mapToDouble(Payroll::getGrossSalary)
                .sum();
    }

    public Map<String, Double> getYearComparison(String userId) {
        int currentYear = java.time.Year.now().getValue();
        int previousYear = currentYear - 1;

        double currentYearSalary = getAnnualSalary(userId, currentYear);
        double previousYearSalary = getAnnualSalary(userId, previousYear);

        double difference = currentYearSalary - previousYearSalary;
        double percentageChange = previousYearSalary > 0 ? (difference / previousYearSalary) * 100 : 0;

        return Map.of(
                "currentYear", currentYearSalary,
                "previousYear", previousYearSalary,
                "difference", difference,
                "percentageChange", percentageChange
        );
    }

    public List<Payroll> createBulkPayroll(String department, String payLevelBand, int month, int year,
                                            Map<String, Double> tdsMap, Map<String, String> remarksMap, String createdBy) {
        List<User> users = userRepository.findAll();
        List<Payroll> created = new java.util.ArrayList<>();

        String financialYear = (month >= 4 ? year + "-" + (year + 1) : (year - 1) + "-" + year);

        for (User user : users) {
            boolean deptMatch = department == null || department.isEmpty() ||
                                department.equalsIgnoreCase(user.getDepartment());
            
            boolean levelMatch = true;
            if (payLevelBand != null && !payLevelBand.isEmpty() && user.getPayLevel() != null) {
                try {
                    String cleanLevel = user.getPayLevel().replaceAll("\\D+", "");
                    int l = Integer.parseInt(cleanLevel);
                    if (payLevelBand.equals("1 to 5")) levelMatch = (l >= 1 && l <= 5);
                    else if (payLevelBand.equals("6 to 9")) levelMatch = (l >= 6 && l <= 9);
                    else if (payLevelBand.equals("10 to 17")) levelMatch = (l >= 10 && l <= 17);
                } catch (Exception e) {}
            }

            if (!deptMatch || !levelMatch) continue;
            if (!Boolean.TRUE.equals(user.getIsActive())) continue;
            if (user.getBasicPay() == null || user.getBasicPay() <= 0) continue;

            // We will check for existing payroll inside the try block to allow updates

            // Calculate dynamic TDS if not explicitly provided in the map
            double tds = 0.0;
            if (tdsMap != null && tdsMap.containsKey(user.getId())) {
                tds = tdsMap.get(user.getId());
            } else {
                com.iipm.payroll.model.ItDeclaration decl = itDeclarationService.getByUserIdAndFinancialYear(user.getId(), financialYear).orElse(null);
                double basic = user.getBasicPay();
                double da = payrollCalculator.calculateDA(basic);
                double hra = payrollCalculator.calculateHRA(basic);
                double ta = payrollCalculator.calculateTA(user.getPayLevel() != null ? user.getPayLevel() : "10");
                double projectedIncome = (basic + da + hra + ta) * 12;
                tds = taxCalculator.calculateMonthlyTds(projectedIncome, decl);
            }

            try {
                // Check if payroll already exists for this month/year
                Optional<Payroll> existingOpt = payrollRepository.findByUserIdAndMonthAndYear(user.getId(), month, year);
                Payroll payroll;
                
                if (existingOpt.isPresent()) {
                    Payroll existing = existingOpt.get();
                    if ("APPROVED".equals(existing.getStatus()) || "RELEASED".equals(existing.getStatus())) {
                        log.warn("Skipping user {} as payroll is already approved/released", user.getUsername());
                        continue;
                    }
                    // Re-calculate
                    double currentTds = tdsMap != null ? tdsMap.getOrDefault(user.getId(), 0.0) : 0.0;
                    Map<String, Double> settings = settingService.getAllPayrollSettings();
                    
                    Map<String, Object> calculation = payrollCalculator.calculateMonthlySalary(
                        user.getBasicPay() != null ? user.getBasicPay() : 0,
                        user.getPayLevel() != null ? user.getPayLevel() : "10",
                        currentTds,
                        0.0,
                        settings
                    );

                    existing.setBasicPay(((Number) calculation.get("basicPay")).doubleValue());
                    existing.setDa(((Number) calculation.get("da")).doubleValue());
                    existing.setHra(((Number) calculation.get("hra")).doubleValue());
                    existing.setTa(((Number) calculation.get("ta")).doubleValue());
                    existing.setNpsEmployerShare(((Number) calculation.get("npsEmployerShare")).doubleValue());
                    existing.setGrossSalary(((Number) calculation.get("grossSalary")).doubleValue());
                    existing.setTds(((Number) calculation.get("tds")).doubleValue());
                    existing.setProfessionalTax(((Number) calculation.get("professionalTax")).doubleValue());
                    existing.setNpsEmployeeShare(((Number) calculation.get("npsEmployeeShare")).doubleValue());
                    existing.setCghs(((Number) calculation.get("cghs")).doubleValue());
                    existing.setOtherDeductions(((Number) calculation.get("otherDeductions")).doubleValue());
                    existing.setTotalDeductions(((Number) calculation.get("totalDeductions")).doubleValue());
                    existing.setNetSalary(((Number) calculation.get("netSalary")).doubleValue());
                    existing.setStatus("PENDING");
                    existing.setUpdatedAt(java.time.LocalDateTime.now());
                    existing.setUpdatedBy(createdBy);
                    existing.setRemark(remarksMap != null ? remarksMap.getOrDefault(user.getId(), "") : "");
                    
                    payrollRepository.save(existing);
                    created.add(existing);
                    continue;
                }

                String remark = remarksMap != null ? remarksMap.getOrDefault(user.getId(), "") : "";

                payroll = createPayroll(user.getId(), month, year, tds, 0, createdBy);
                payroll.setRemark(remark);
                payroll.setStatus("PENDING"); // Submitted for approval
                payrollRepository.save(payroll);
                created.add(payroll);
            } catch (Exception e) {
                log.warn("Skipping user {} during bulk processing: {}", user.getUsername(), e.getMessage());
            }
        }
        log.info("Bulk payroll: created {} records", created.size());
        return created;
    }

    @Autowired
    private com.iipm.payroll.util.ExcelGenerator excelGenerator;

    public byte[] exportApprovalSheet(int month, int year) {
        List<Payroll> payrolls = getPayrollsByMonth(month, year);
        if (payrolls.isEmpty()) {
            throw new RuntimeException("No payroll records found for " + month + "/" + year);
        }

        try {
            return excelGenerator.generateApprovalSheetExcel(payrolls, month, year);
        } catch (Exception e) {
            log.error("Error generating approval sheet", e);
            throw new RuntimeException("Failed to generate approval sheet");
        }
    }

    
    public List<Payroll> previewBulkPayroll(String department, String payLevelBand, int month, int year) {
        List<User> users = userRepository.findAll();
        List<Payroll> preview = new java.util.ArrayList<>();
        String financialYear = (month >= 4 ? year + "-" + (year + 1) : (year - 1) + "-" + year);
        Map<String, Double> settings = settingService.getAllPayrollSettings();

        for (User user : users) {
            boolean deptMatch = department == null || department.isEmpty() ||
                                department.equalsIgnoreCase(user.getDepartment());
            boolean levelMatch = true;
            if (payLevelBand != null && !payLevelBand.isEmpty() && user.getPayLevel() != null) {
                try {
                    String cleanLevel = user.getPayLevel().replaceAll("\\D+", "");
                    int l = Integer.parseInt(cleanLevel);
                    if (payLevelBand.equals("1 to 5")) levelMatch = (l >= 1 && l <= 5);
                    else if (payLevelBand.equals("6 to 9")) levelMatch = (l >= 6 && l <= 9);
                    else if (payLevelBand.equals("10 to 17")) levelMatch = (l >= 10 && l <= 17);
                } catch (Exception e) {}
            }
            if (!deptMatch || !levelMatch) continue;
            if (!Boolean.TRUE.equals(user.getIsActive())) continue;
            if (user.getBasicPay() == null || user.getBasicPay() <= 0) continue;

            com.iipm.payroll.model.ItDeclaration decl = itDeclarationService.getByUserIdAndFinancialYear(user.getId(), financialYear).orElse(null);
            double basic = user.getBasicPay();
            double da = payrollCalculator.calculateDA(basic);
            double hra = payrollCalculator.calculateHRA(basic);
            double ta = payrollCalculator.calculateTA(user.getPayLevel() != null ? user.getPayLevel() : "10");
            double projectedIncome = (basic + da + hra + ta) * 12;
            double tds = taxCalculator.calculateMonthlyTds(projectedIncome, decl);
            
            Map<String, Object> calculation = payrollCalculator.calculateMonthlySalary(
                    basic, 
                    user.getPayLevel() != null ? user.getPayLevel() : "10", 
                    tds, 
                    0.0, 
                    settings
            );

            Payroll p = Payroll.builder()
                .userId(user.getId())
                .employeeId(user.getEmployeeId())
                .month(month)
                .year(year)
                .basicPay(basic)
                .da(((Number) calculation.get("da")).doubleValue())
                .hra(((Number) calculation.get("hra")).doubleValue())
                .ta(((Number) calculation.get("ta")).doubleValue())
                .otherAllowances(0.0)
                .grossSalary(((Number) calculation.get("grossSalary")).doubleValue())
                .tds(((Number) calculation.get("tds")).doubleValue())
                .npsEmployeeShare(((Number) calculation.get("npsEmployeeShare")).doubleValue())
                .npsEmployerShare(((Number) calculation.get("npsEmployerShare")).doubleValue())
                .professionalTax(((Number) calculation.get("professionalTax")).doubleValue())
                .cghs(((Number) calculation.get("cghs")).doubleValue())
                .otherDeductions(0.0)
                .totalDeductions(((Number) calculation.get("totalDeductions")).doubleValue())
                .netSalary(((Number) calculation.get("netSalary")).doubleValue())
                .status("DRAFT")
                .build();
                
            preview.add(p);
        }
        return preview;
    }
}
