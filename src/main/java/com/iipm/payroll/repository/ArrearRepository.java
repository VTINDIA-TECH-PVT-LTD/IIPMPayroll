package com.iipm.payroll.repository;

import com.iipm.payroll.model.Arrear;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ArrearRepository extends MongoRepository<Arrear, String> {
    List<Arrear> findByUserId(String userId);

    List<Arrear> findByArrearType(String arrearType);

    List<Arrear> findByStatus(String status);

    List<Arrear> findByUserIdAndStatus(String userId, String status);

    List<Arrear> findByArrearTypeAndStatus(String arrearType, String status);

    List<Arrear> findByUserIdOrderByCreatedAtDesc(String userId);
}
