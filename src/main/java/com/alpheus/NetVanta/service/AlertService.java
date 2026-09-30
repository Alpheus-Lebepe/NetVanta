package com.alpheus.NetVanta.service;

import com.alpheus.NetVanta.entity.Alert;
import com.alpheus.NetVanta.entity.AlertStatus;
import com.alpheus.NetVanta.entity.Device;
import com.alpheus.NetVanta.entity.SecurityEvent;
import com.alpheus.NetVanta.entity.SecurityEventType;
import com.alpheus.NetVanta.repository.AlertRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AlertService {

    private final AlertRepository alertRepository;

    public AlertService(AlertRepository alertRepository) {
        this.alertRepository = alertRepository;
    }

    public void processSecurityEvent(SecurityEvent event) {

        if (event == null || event.getDevice() == null) {
            return;
        }

        Device device = event.getDevice();

        switch (event.getEventType()) {

            case DEVICE_OFFLINE -> {
                createAlertIfNeeded(
                        event,
                        device,
                        SecurityEventType.DEVICE_OFFLINE
                );
            }

            case HIGH_RESPONSE_TIME -> {
                createAlertIfNeeded(
                        event,
                        device,
                        SecurityEventType.HIGH_RESPONSE_TIME
                );
            }

            case DEVICE_ONLINE -> {
                resolveAlerts(
                        device,
                        SecurityEventType.DEVICE_OFFLINE
                );
            }
        }
    }

    private void createAlertIfNeeded(
            SecurityEvent event,
            Device device,
            SecurityEventType eventType) {

        List<AlertStatus> openStatuses =
                List.of(
                        AlertStatus.ACTIVE,
                        AlertStatus.ACKNOWLEDGED
                );

        boolean alertAlreadyExists =
                alertRepository
                        .existsByDeviceIdAndEventTypeAndStatusIn(
                                device.getId(),
                                eventType,
                                openStatuses
                        );

        if (alertAlreadyExists) {
            return;
        }

        Alert alert = new Alert();

        alert.setDevice(device);
        alert.setEventType(eventType);
        alert.setSeverity(event.getSeverity());
        alert.setStatus(AlertStatus.ACTIVE);
        alert.setMessage(event.getMessage());
        alert.setCreatedAt(LocalDateTime.now());

        alertRepository.save(alert);
    }

    public void resolveAlerts(
            Device device,
            SecurityEventType eventType) {

        List<AlertStatus> openStatuses =
                List.of(
                        AlertStatus.ACTIVE,
                        AlertStatus.ACKNOWLEDGED
                );

        List<Alert> alerts =
                alertRepository
                        .findByDeviceIdAndEventTypeAndStatusIn(
                                device.getId(),
                                eventType,
                                openStatuses
                        );

        if (alerts.isEmpty()) {
            return;
        }

        LocalDateTime resolvedAt =
                LocalDateTime.now();

        for (Alert alert : alerts) {

            alert.setStatus(
                    AlertStatus.RESOLVED
            );

            alert.setResolvedAt(
                    resolvedAt
            );
        }

        alertRepository.saveAll(alerts);
    }
}