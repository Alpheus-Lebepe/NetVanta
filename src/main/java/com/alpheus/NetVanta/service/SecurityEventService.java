package com.alpheus.NetVanta.service;

import com.alpheus.NetVanta.entity.Device;
import com.alpheus.NetVanta.entity.DeviceStatus;
import com.alpheus.NetVanta.entity.SecurityEvent;
import com.alpheus.NetVanta.entity.SecurityEventSeverity;
import com.alpheus.NetVanta.entity.SecurityEventType;
import com.alpheus.NetVanta.repository.SecurityEventRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class SecurityEventService {

    private final SecurityEventRepository securityEventRepository;

    public SecurityEventService(
            SecurityEventRepository securityEventRepository) {

        this.securityEventRepository =
                securityEventRepository;
    }

    public void recordDeviceStatusEvent(
            Device device,
            DeviceStatus status) {

        SecurityEvent event = new SecurityEvent();

        event.setDevice(device);
        event.setCreatedAt(LocalDateTime.now());

        if (status == DeviceStatus.OFFLINE) {

            event.setEventType(
                    SecurityEventType.DEVICE_OFFLINE
            );

            event.setSeverity(
                    SecurityEventSeverity.CRITICAL
            );

            event.setMessage(
                    "Device is unreachable."
            );

        } else if (status == DeviceStatus.ONLINE) {

            event.setEventType(
                    SecurityEventType.DEVICE_ONLINE
            );

            event.setSeverity(
                    SecurityEventSeverity.INFO
            );

            event.setMessage(
                    "Device is online and responding."
            );

        }

        securityEventRepository.save(event);
    }

    public void recordHighResponseTimeEvent(
            Device device,
            long responseTime) {

        SecurityEvent event = new SecurityEvent();

        event.setDevice(device);

        event.setEventType(
                SecurityEventType.HIGH_RESPONSE_TIME
        );

        event.setSeverity(
                SecurityEventSeverity.WARNING
        );

        event.setMessage(
                "High response time detected: "
                        + responseTime
                        + " ms."
        );

        event.setCreatedAt(LocalDateTime.now());

        securityEventRepository.save(event);
    }
}