package com.alpheus.NetVanta.service;

import com.alpheus.NetVanta.entity.Device;
import com.alpheus.NetVanta.repository.DeviceRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class NetworkMonitoringScheduler {

    private final DeviceRepository deviceRepository;
    private final NetworkMonitorService networkMonitorService;
    private final MonitoringStatusService monitoringStatusService;

    public NetworkMonitoringScheduler(
            DeviceRepository deviceRepository,
            NetworkMonitorService networkMonitorService,
            MonitoringStatusService monitoringStatusService) {

        this.deviceRepository = deviceRepository;
        this.networkMonitorService = networkMonitorService;
        this.monitoringStatusService = monitoringStatusService;
    }

    @Scheduled(fixedRate = 60000)
    public void monitorAllDevices() {

        System.out.println(
                "NetVanta automatic monitoring scan started."
        );

        List<Device> devices =
                deviceRepository.findAll();

        monitoringStatusService.setMonitoredDevices(
                devices.size()
        );

        if (devices.isEmpty()) {

            monitoringStatusService.setLastScan(
                    LocalDateTime.now()
            );

            System.out.println(
                    "No devices registered. Nothing to monitor."
            );

            return;
        }

        for (Device device : devices) {

            try {

                networkMonitorService.checkDevice(
                        device.getId()
                );

                System.out.println(
                        "Checked device: "
                                + device.getName()
                                + " ("
                                + device.getIpAddress()
                                + ")"
                );

            } catch (Exception e) {

                System.err.println(
                        "Unable to check device: "
                                + device.getName()
                                + " - "
                                + e.getMessage()
                );
            }
        }

        monitoringStatusService.setLastScan(
                LocalDateTime.now()
        );

        System.out.println(
                "NetVanta automatic monitoring scan completed."
        );
    }
}