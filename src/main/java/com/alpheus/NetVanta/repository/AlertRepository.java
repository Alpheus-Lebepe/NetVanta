package com.alpheus.NetVanta.repository;

import com.alpheus.NetVanta.entity.Alert;
import com.alpheus.NetVanta.entity.AlertStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import com.alpheus.NetVanta.entity.SecurityEventType;
import java.util.Collection;

import java.util.List;

public interface AlertRepository
        extends JpaRepository<Alert, Long> {

        boolean existsByDeviceIdAndEventTypeAndStatusIn(
        Long deviceId,
        SecurityEventType eventType,
        Collection<AlertStatus> statuses
);

List<Alert> findByDeviceIdAndEventTypeAndStatusIn(
        Long deviceId,
        SecurityEventType eventType,
        Collection<AlertStatus> statuses
);

    List<Alert> findAllByOrderByCreatedAtDesc();

    List<Alert> findByStatusOrderByCreatedAtDesc(
            AlertStatus status
    );

    List<Alert> findByDeviceIdOrderByCreatedAtDesc(
            Long deviceId
    );

    long countByStatus(AlertStatus status);

    void deleteByDeviceId(Long deviceId);
}