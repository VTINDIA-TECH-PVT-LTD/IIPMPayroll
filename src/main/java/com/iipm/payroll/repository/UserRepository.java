package com.iipm.payroll.repository;

import com.iipm.payroll.model.User;
import com.iipm.payroll.model.UserRole;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByUsername(String username);

    Optional<User> findByEmployeeId(String employeeId);

    Optional<User> findByEmail(String email);

    List<User> findByRole(UserRole role);

    List<User> findByIsActiveTrueOrderByCreatedAtDesc();

    @Query("{ 'role': ?0, 'isActive': true }")
    List<User> findActiveByRole(UserRole role);

    boolean existsByUsername(String username);

    boolean existsByEmployeeId(String employeeId);
}
