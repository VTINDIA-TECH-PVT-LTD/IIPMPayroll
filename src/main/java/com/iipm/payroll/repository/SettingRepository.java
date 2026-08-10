package com.iipm.payroll.repository;

import com.iipm.payroll.model.Setting;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SettingRepository extends MongoRepository<Setting, String> {
    Optional<Setting> findByKey(String key);

    Optional<Setting> findByKeyAndIsActiveTrue(String key);

    List<Setting> findByIsActiveTrueOrderByCategory();

    List<Setting> findByCategory(String category);

    List<Setting> findByCategoryAndIsActiveTrue(String category);

    @Query("{ 'key': ?0, 'isActive': true }")
    Optional<Setting> findActiveSettingByKey(String key);

    List<Setting> findAllByIsActiveTrue();
}
