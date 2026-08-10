package com.iipm.payroll.service;

import com.iipm.payroll.model.ItDeclaration;
import com.iipm.payroll.repository.ItDeclarationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ItDeclarationService {

    @Autowired
    private ItDeclarationRepository itDeclarationRepository;

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
        if (declaration.getStatus() == null) {
            declaration.setStatus("PENDING");
        }
        return itDeclarationRepository.save(declaration);
    }

    public Optional<ItDeclaration> updateStatus(String id, String status) {
        Optional<ItDeclaration> optionalItDeclaration = itDeclarationRepository.findById(id);
        if (optionalItDeclaration.isPresent()) {
            ItDeclaration declaration = optionalItDeclaration.get();
            declaration.setStatus(status);
            return Optional.of(itDeclarationRepository.save(declaration));
        }
        return Optional.empty();
    }

    public List<ItDeclaration> bulkApprove(List<String> ids) {
        return ids.stream()
                .map(id -> updateStatus(id, "APPROVED"))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(java.util.stream.Collectors.toList());
    }

    public List<ItDeclaration> bulkReject(List<String> ids) {
        return ids.stream()
                .map(id -> updateStatus(id, "REJECTED"))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(java.util.stream.Collectors.toList());
    }
}
