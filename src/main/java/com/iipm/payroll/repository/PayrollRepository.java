package com.iipm.payroll.repository;

import com.iipm.payroll.model.Payroll;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PayrollRepository extends MongoRepository<Payroll, String> {
    Optional<Payroll> findByUserIdAndMonthAndYear(String userId, int month, int year);

    List<Payroll> findByUserId(String userId);

    List<Payroll> findByUserIdOrderByYearDescMonthDesc(String userId);

    List<Payroll> findByMonthAndYear(int month, int year);

    List<Payroll> findByStatus(String status);

    List<Payroll> findByStatusAndYearOrderByMonthDesc(String status, int year);

    @Query("{ 'month': ?0, 'year': ?1 }")
    List<Payroll> findByMonthYear(int month, int year);

    @Query("{ 'userId': ?0, 'year': ?1 }")
    List<Payroll> findByUserIdAndYear(String userId, int year);
}
