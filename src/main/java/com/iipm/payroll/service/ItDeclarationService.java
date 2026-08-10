package com.iipm.payroll.service;

import com.iipm.payroll.model.ItDeclaration;
import com.iipm.payroll.model.Notification;
import com.iipm.payroll.repository.ItDeclarationRepository;
import com.iipm.payroll.repository.NotificationRepository;
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
        // If re-submitting after rejection, reset status to PENDING
        if (declaration.getId() != null) {
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
        return itDeclarationRepository.save(declaration);
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

            // Send notification to employee
            try {
                Notification notif = new Notification();
                notif.setUserId(declaration.getUserId());
                notif.setTitle("IT Declaration " + status);
                if ("APPROVED".equals(status)) {
                    notif.setMessage("Your IT Declaration for FY " + declaration.getFinancialYear() + " has been APPROVED. You can now view and print your Form 16.");
                } else {
                    notif.setMessage("Your IT Declaration for FY " + declaration.getFinancialYear() + " has been REJECTED. Reason: " + (reason != null ? reason : "Not specified") + ". Please resubmit.");
                }
                notif.setRead(false);
                notif.setCreatedAt(LocalDateTime.now());
                notificationRepository.save(notif);
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
