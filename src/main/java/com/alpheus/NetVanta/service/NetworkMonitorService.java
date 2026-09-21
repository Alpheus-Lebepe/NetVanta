package com.alpheus.NetVanta.service;

import com.alpheus.NetVanta.entity.Device;
import com.alpheus.NetVanta.entity.DeviceStatus;
import com.alpheus.NetVanta.entity.HealthCheck;
import com.alpheus.NetVanta.repository.DeviceRepository;
import com.alpheus.NetVanta.repository.HealthCheckRepository;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.InetAddress;
import java.time.LocalDateTime;

@Service
public class NetworkMonitorService {

    private final DeviceRepository deviceRepository;
    private final HealthCheckRepository healthCheckRepository;
    private final SecurityEventService securityEventService;

    public NetworkMonitorService(
            DeviceRepository deviceRepository,
            HealthCheckRepository healthCheckRepository,
            SecurityEventService securityEventService) {

        this.deviceRepository = deviceRepository;
        this.healthCheckRepository = healthCheckRepository;
        this.securityEventService = securityEventService;
    }

    public Device checkDevice(Long deviceId) {

        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Device not found with ID: " + deviceId
                        ));

        DeviceStatus previousStatus = device.getStatus();

        DeviceStatus status;
        long responseTime;

        try {

            InetAddress address =
                    InetAddress.getByName(device.getIpAddress());

            long startTime =
                    System.currentTimeMillis();

            boolean reachable =
                    address.isReachable(3000);

            responseTime =
                    System.currentTimeMillis() - startTime;

            if (reachable) {
                status = DeviceStatus.ONLINE;
            } else {
                status = DeviceStatus.OFFLINE;
            }

        } catch (IOException e) {

            status = DeviceStatus.OFFLINE;
            responseTime = 0;
        }

        device.setStatus(status);
        device.setLastChecked(LocalDateTime.now());

        Device savedDevice =
                deviceRepository.save(device);

        /*
         * Record a security event only when
         * the device changes state.
         */
        boolean statusChanged =
                previousStatus == null
                || previousStatus == DeviceStatus.UNKNOWN
                || previousStatus != status;

        if (statusChanged) {

            securityEventService.recordDeviceStatusEvent(
                    savedDevice,
                    status
            );
        }

/*
 * Record high response time separately.
 */
if (status == DeviceStatus.ONLINE
        && responseTime >= 500) {

    securityEventService.recordHighResponseTimeEvent(
            savedDevice,
            responseTime
    );
}

/*
 * Record every health check as a monitoring event.
 */
securityEventService.recordDeviceCheckEvent(
        savedDevice,
        status,
        responseTime
);

/*
 * Every health check is still recorded.
 */
HealthCheck healthCheck =
        new HealthCheck();

healthCheck.setDevice(savedDevice);
healthCheck.setStatus(status);
healthCheck.setResponseTime(responseTime);
healthCheck.setCheckedAt(LocalDateTime.now());

healthCheckRepository.save(healthCheck);

        return savedDevice;
}
}