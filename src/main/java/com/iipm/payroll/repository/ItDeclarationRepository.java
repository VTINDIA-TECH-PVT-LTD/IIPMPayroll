package com.iipm.payroll.repository;

import com.iipm.payroll.model.ItDeclaration;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ItDeclarationRepository extends MongoRepository<ItDeclaration, String> {
    List<ItDeclaration> findByUserId(String userId);
    Optional<ItDeclaration> findByUserIdAndFinancialYear(String userId, String financialYear);
    List<ItDeclaration> findByStatus(String status);
}
