package com.iipm.payroll.repository;

import com.iipm.payroll.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {
    List<Notification> findByUserId(String userId);

    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);

    List<Notification> findByUserIdAndIsReadFalse(String userId);

    List<Notification> findByUserIdAndType(String userId, String type);

    List<Notification> findByType(String type);

    long countByUserIdAndIsReadFalse(String userId);
}
