package com.iipm.payroll.service;

import com.iipm.payroll.model.Arrear;
import com.iipm.payroll.model.User;
import com.iipm.payroll.repository.ArrearRepository;
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
public class ArrearService {

    @Autowired
    private ArrearRepository arrearRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PayrollCalculator payrollCalculator;

    @Autowired
    private SettingService settingService;

    @Autowired
    private NotificationService notificationService;

    public Arrear createDAArear(String userId, int fromMonth, int fromYear, int toMonth, int toYear,
                               double oldDAPercentage, double newDAPercentage, String createdBy) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Calculate months
        int months = ((toYear - fromYear) * 12) + (toMonth - fromMonth) + 1;

        // Calculate DA arrears
        double grossAmount = payrollCalculator.calculateDAArrays(
                user.getBasicPay() != null ? user.getBasicPay() : 0,
                oldDAPercentage,
                newDAPercentage,
                months
        );

        // Get settings
        Map<String, Double> settings = settingService.getAllPayrollSettings();

        // Calculate deductions
        Map<String, Double> deductions = payrollCalculator.calculateArrearDeductions(grossAmount, 0, settings);

        Arrear arrear = Arrear.builder()
                .userId(userId)
                .employeeId(user.getEmployeeId())
                .arrearType("DA")
                .fromMonth(fromMonth)
                .fromYear(fromYear)
                .toMonth(toMonth)
                .toYear(toYear)
                .grossAmount(grossAmount)
                .tds(deductions.get("tds"))
                .npsEmployeeShare(deductions.get("npsEmployeeShare"))
                .professionalTax(deductions.get("professionalTax"))
                .cghs(deductions.get("cghs"))
                .totalDeductions(deductions.get("totalDeductions"))
                .netAmount(grossAmount - deductions.get("totalDeductions"))
                .status("DRAFT")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .createdBy(createdBy)
                .updatedBy(createdBy)
                .build();

        Arrear saved = arrearRepository.save(arrear);
        log.info("DA Arrear created for user {} ({}/{}  to {}/{})", user.getUsername(), fromMonth, fromYear, toMonth, toYear);

        notificationService.createNotification(userId, "ARREAR_CREATED",
                "DA Arrear Created",
                "DA arrear for period " + fromMonth + "/" + fromYear + " to " + toMonth + "/" + toYear + " has been created",
                "MEDIUM");

        return saved;
    }

    public Arrear createPromotionArrear(String userId, double oldBasicPay, double newBasicPay,
                                       int daysWorked, int totalDays, String createdBy) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Calculate promotion arrears
        double grossAmount = payrollCalculator.calculatePromotionArrears(oldBasicPay, newBasicPay, daysWorked, totalDays);

        // Get settings
        Map<String, Double> settings = settingService.getAllPayrollSettings();

        // Calculate deductions
        Map<String, Double> deductions = payrollCalculator.calculateArrearDeductions(grossAmount, 0, settings);

        Arrear arrear = Arrear.builder()
                .userId(userId)
                .employeeId(user.getEmployeeId())
                .arrearType("PROMOTION")
                .grossAmount(grossAmount)
                .oldBasicPay(oldBasicPay)
                .newBasicPay(newBasicPay)
                .daysWorked(daysWorked)
                .totalDays(totalDays)
                .tds(deductions.get("tds"))
                .npsEmployeeShare(deductions.get("npsEmployeeShare"))
                .professionalTax(deductions.get("professionalTax"))
                .cghs(deductions.get("cghs"))
                .totalDeductions(deductions.get("totalDeductions"))
                .netAmount(grossAmount - deductions.get("totalDeductions"))
                .status("DRAFT")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .createdBy(createdBy)
                .updatedBy(createdBy)
                .build();

        Arrear saved = arrearRepository.save(arrear);
        log.info("Promotion Arrear created for user {}", user.getUsername());

        notificationService.createNotification(userId, "PROMOTION_ARREAR",
                "Promotion Arrear Created",
                "Promotion arrear has been created for your salary enhancement",
                "HIGH");

        return saved;
    }

    public Arrear getArrearById(String id) {
        return arrearRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Arrear not found"));
    }

    public List<Arrear> getArrearsByUser(String userId) {
        return arrearRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Arrear> getArrearsByType(String arrearType) {
        return arrearRepository.findByArrearType(arrearType);
    }

    public List<Arrear> getPendingArrears() {
        return arrearRepository.findByStatus("DRAFT");
    }

    public List<Arrear> getAllArrears() {
        return arrearRepository.findAll();
    }

    public Arrear approveArrear(String arrearId, String approvedBy) {
        Arrear arrear = getArrearById(arrearId);

        arrear.setStatus("APPROVED");
        arrear.setApprovedBy(approvedBy);
        arrear.setApprovedAt(LocalDateTime.now());
        arrear.setUpdatedAt(LocalDateTime.now());

        Arrear updated = arrearRepository.save(arrear);
        log.info("Arrear approved: {}", arrearId);

        notificationService.createNotification(arrear.getUserId(), "ARREAR_APPROVED",
                "Arrear Approved",
                "Your " + arrear.getArrearType() + " arrear has been approved",
                "HIGH");

        return updated;
    }

    public Arrear rejectArrear(String arrearId, String reason, String updatedBy) {
        Arrear arrear = getArrearById(arrearId);

        arrear.setStatus("REJECTED");
        arrear.setUpdatedAt(LocalDateTime.now());
        arrear.setUpdatedBy(updatedBy);

        Arrear updated = arrearRepository.save(arrear);
        log.info("Arrear rejected: {}", arrearId);

        notificationService.createNotification(arrear.getUserId(), "ARREAR_REJECTED",
                "Arrear Rejected",
                "Your " + arrear.getArrearType() + " arrear was rejected: " + reason,
                "HIGH");

        return updated;
    }

    public Arrear markAsPaid(String arrearId, String paidBy) {
        Arrear arrear = getArrearById(arrearId);

        if (!arrear.getStatus().equals("APPROVED")) {
            throw new RuntimeException("Only approved arrears can be marked as paid");
        }

        arrear.setStatus("PAID");
        arrear.setPaidAt(LocalDateTime.now());
        arrear.setUpdatedAt(LocalDateTime.now());
        arrear.setUpdatedBy(paidBy);

        Arrear updated = arrearRepository.save(arrear);
        log.info("Arrear marked as paid: {}", arrearId);

        notificationService.createNotification(arrear.getUserId(), "ARREAR_PAID",
                "Arrear Paid",
                "Your " + arrear.getArrearType() + " arrear of Rs. " + arrear.getNetAmount() + " has been credited",
                "HIGH");

        return updated;
    }
}
