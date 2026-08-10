package com.iipm.payroll.repository;

import com.iipm.payroll.model.PayMatrix;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PayMatrixRepository extends MongoRepository<PayMatrix, String> {
    Optional<PayMatrix> findByPayLevelAndPayIndex(int payLevel, int payIndex);

    List<PayMatrix> findByPayLevel(int payLevel);

    List<PayMatrix> findByPayLevelOrderByPayIndexAsc(int payLevel);

    List<PayMatrix> findByIsActiveTrueOrderByPayLevelAscPayIndexAsc();

    Optional<PayMatrix> findByPayLevelAndPayIndexAndIsActiveTrue(int payLevel, int payIndex);
}
