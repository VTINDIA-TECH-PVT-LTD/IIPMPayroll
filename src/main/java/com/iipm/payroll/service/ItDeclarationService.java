package com.iipm.payroll.service;

import com.iipm.payroll.model.ItDeclaration;
import com.iipm.payroll.model.Notification;
import com.iipm.payroll.model.User;
import com.iipm.payroll.model.UserRole;
import com.iipm.payroll.repository.ItDeclarationRepository;
import com.iipm.payroll.repository.NotificationRepository;
import com.iipm.payroll.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ItDeclarationService {

    @Autowired
    private ItDeclarationRepository itDeclarationRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    public List<ItDeclaration> getByUserId(String userId) {
        return itDeclarationRepository.findByUserId(userId);
    }

    public List<ItDeclaration> getAll() {
        return itDeclarationRepository.findAll();
    }

    public List<ItDeclaration> getPendingDeclarations() {
        return itDeclarationRepository.findByStatus("PENDING");
    }

    public Optional<ItDeclaration> getByUserIdAndFinancialYear(String userId, String financialYear) {
        return itDeclarationRepository.findByUserIdAndFinancialYear(userId, financialYear);
    }

    public ItDeclaration saveOrUpdate(ItDeclaration declaration) {
        boolean isNew = (declaration.getId() == null);

        // If re-submitting after rejection, reset status to PENDING
        if (!isNew) {
            Optional<ItDeclaration> existing = itDeclarationRepository.findById(declaration.getId());
            if (existing.isPresent() && "REJECTED".equals(existing.get().getStatus())) {
                declaration.setStatus("PENDING");
                declaration.setRejectionReason(null);
                declaration.setReviewedBy(null);
                declaration.setReviewedAt(null);
            }
        }
        if (declaration.getStatus() == null) {
            declaration.setStatus("PENDING");
        }
        ItDeclaration saved = itDeclarationRepository.save(declaration);

        // Notify FA_ADMIN and FA_OPERATOR users when employee submits/re-submits
        try {
            // Look up employee name from UserRepository
            String employeeName = userRepository.findById(declaration.getUserId())
                    .map(u -> u.getFirstName() + " " + u.getLastName())
                    .orElse(declaration.getUserId());
            String fyLabel = declaration.getFinancialYear() != null ? declaration.getFinancialYear() : "";
            String notifTitle = "IT Declaration Submitted";
            String notifMsg = "Employee " + employeeName + " has submitted IT Declaration for FY " + fyLabel + ". Please review and approve.";

            // Notify all FA_ADMIN and FA_OPERATOR users
            List<User> faAdmins = userRepository.findByRole(UserRole.FA_ADMIN);
            List<User> faOperators = userRepository.findByRole(UserRole.FA_OPERATOR);

            for (User approver : faAdmins) {
                createNotification(approver.getId(), "IT_DECLARATION_SUBMITTED", notifTitle, notifMsg);
            }
            for (User approver : faOperators) {
                createNotification(approver.getId(), "IT_DECLARATION_SUBMITTED", notifTitle, notifMsg);
            }
        } catch (Exception e) {
            // Don't fail on notification error
        }

        return saved;
    }

    private void createNotification(String userId, String type, String title, String message) {
        Notification notif = new Notification();
        notif.setUserId(userId);
        notif.setType(type);
        notif.setTitle(title);
        notif.setMessage(message);
        notif.setRead(false);
        notif.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(notif);
    }

    public Optional<ItDeclaration> updateStatus(String id, String status, String reason, String reviewedBy) {
        Optional<ItDeclaration> opt = itDeclarationRepository.findById(id);
        if (opt.isPresent()) {
            ItDeclaration declaration = opt.get();
            declaration.setStatus(status);
            declaration.setReviewedBy(reviewedBy);
            declaration.setReviewedAt(LocalDateTime.now());
            if ("REJECTED".equals(status) && reason != null) {
                declaration.setRejectionReason(reason);
            } else if ("APPROVED".equals(status)) {
                declaration.setRejectionReason(null);
            }
            ItDeclaration saved = itDeclarationRepository.save(declaration);

            // Notify employee about the decision
            try {
                String title = "IT Declaration " + ("APPROVED".equals(status) ? "Approved ✅" : "Rejected ❌");
                String message;
                if ("APPROVED".equals(status)) {
                    message = "Your IT Declaration for FY " + declaration.getFinancialYear() + " has been APPROVED. You can now view and download your Form 16.";
                } else {
                    message = "Your IT Declaration for FY " + declaration.getFinancialYear() + " has been REJECTED. Reason: " + (reason != null ? reason : "Not specified") + ". Please resubmit with corrections.";
                }
                createNotification(declaration.getUserId(), "IT_DECLARATION_" + status, title, message);
            } catch (Exception e) {
                // Don't fail on notification error
            }

            return Optional.of(saved);
        }
        return Optional.empty();
    }

    // Legacy overload
    public Optional<ItDeclaration> updateStatus(String id, String status) {
        return updateStatus(id, status, null, null);
    }

    public List<ItDeclaration> bulkApprove(List<String> ids) {
        return ids.stream()
                .map(id -> updateStatus(id, "APPROVED", null, null))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(java.util.stream.Collectors.toList());
    }

    public List<ItDeclaration> bulkReject(List<String> ids) {
        return ids.stream()
                .map(id -> updateStatus(id, "REJECTED", null, null))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(java.util.stream.Collectors.toList());
    }
}
