package com.alpheus.NetVanta.service;

import com.alpheus.NetVanta.entity.DeviceStatus;
import com.alpheus.NetVanta.repository.DeviceRepository;
import com.alpheus.NetVanta.repository.HealthCheckRepository;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {

    private final DeviceRepository deviceRepository;
    private final HealthCheckRepository healthCheckRepository;

    public DashboardService(
            DeviceRepository deviceRepository,
            HealthCheckRepository healthCheckRepository) {

        this.deviceRepository = deviceRepository;
        this.healthCheckRepository = healthCheckRepository;
    }

    public DashboardStats getDashboardStats() {

        long totalDevices = deviceRepository.count();

        long onlineDevices =
                deviceRepository.countByStatus(DeviceStatus.ONLINE);

        long offlineDevices =
                deviceRepository.countByStatus(DeviceStatus.OFFLINE);

        long unknownDevices =
                deviceRepository.countByStatus(DeviceStatus.UNKNOWN);

        Double average =
                healthCheckRepository.getAverageResponseTime();

        double averageResponseTime =
                average != null ? average : 0.0;

        return new DashboardStats(
                totalDevices,
                onlineDevices,
                offlineDevices,
                unknownDevices,
                averageResponseTime
        );
    }
}