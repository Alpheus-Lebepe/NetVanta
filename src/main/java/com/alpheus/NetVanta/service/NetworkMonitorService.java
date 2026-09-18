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

    public NetworkMonitorService(
            DeviceRepository deviceRepository,
            HealthCheckRepository healthCheckRepository) {

        this.deviceRepository = deviceRepository;
        this.healthCheckRepository = healthCheckRepository;
    }

    public Device checkDevice(Long deviceId) {

        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() ->
                        new RuntimeException("Device not found with ID: " + deviceId));

        DeviceStatus status;
        long responseTime;

        try {

            InetAddress address =
                    InetAddress.getByName(device.getIpAddress());

            long startTime = System.currentTimeMillis();

            boolean reachable = address.isReachable(3000);

            responseTime = System.currentTimeMillis() - startTime;

            if (reachable) {
                status = DeviceStatus.ONLINE;
            } else {
                status = DeviceStatus.OFFLINE;
            }

        } catch (IOException e) {

            status = DeviceStatus.OFFLINE;
            responseTime = 0;
        }

        // Update current device status
        device.setStatus(status);
        device.setLastChecked(LocalDateTime.now());

        Device savedDevice = deviceRepository.save(device);

        // Create health check history record
        HealthCheck healthCheck = new HealthCheck();

        healthCheck.setDevice(savedDevice);
        healthCheck.setStatus(status);
        healthCheck.setResponseTime(responseTime);
        healthCheck.setCheckedAt(LocalDateTime.now());

        healthCheckRepository.save(healthCheck);

        return savedDevice;
    }
}