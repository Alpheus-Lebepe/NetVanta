package com.alpheus.NetVanta.service;

import com.alpheus.NetVanta.entity.Device;
import com.alpheus.NetVanta.repository.DeviceRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
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

    @Scheduled(fixedRate = 1000)
    public void monitorAllDevices() {

        /*
         * Do nothing when monitoring is paused.
         */
        if (!monitoringStatusService.isActive()) {
            return;
        }

        /*
         * Prevent another scan from starting while
         * a scan is already running.
         */
        if (monitoringStatusService.isScanning()) {
            return;
        }

        LocalDateTime lastScan =
                monitoringStatusService.getLastScan();

        /*
         * First scan after application startup.
         */
        if (lastScan == null) {

            performMonitoringScan();

            return;
        }

        long secondsSinceLastScan =
                ChronoUnit.SECONDS.between(
                        lastScan,
                        LocalDateTime.now()
                );

        long intervalSeconds =
                monitoringStatusService
                        .getScanInterval() / 1000;

        /*
         * Wait until the configured interval
         * has elapsed.
         */
        if (secondsSinceLastScan < intervalSeconds) {
            return;
        }

        performMonitoringScan();
    }

    private void performMonitoringScan() {

        /*
         * Tell the frontend that the backend is
         * ACTUALLY scanning.
         */
        monitoringStatusService.setScanning(true);

        System.out.println(
                "NetVanta automatic monitoring scan started."
        );

        try {

            List<Device> devices =
                    deviceRepository.findAll();

            monitoringStatusService.setMonitoredDevices(
                    devices.size()
            );

            if (devices.isEmpty()) {

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

        } finally {

            /*
             * The scan has ACTUALLY finished.
             *
             * Only now do we update lastScan.
             */
            monitoringStatusService.setLastScan(
                    LocalDateTime.now()
            );

            /*
             * Tell the frontend that scanning
             * has finished.
             */
            monitoringStatusService.setScanning(false);

            System.out.println(
                    "NetVanta automatic monitoring scan completed."
            );

            System.out.println(
                    "Last scan recorded at: "
                            + monitoringStatusService.getLastScan()
            );

            System.out.println(
                    "Devices monitored: "
                            + monitoringStatusService.getMonitoredDevices()
            );
        }
    }
}