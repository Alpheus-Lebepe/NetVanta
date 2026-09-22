package com.alpheus.NetVanta.controller;

import com.alpheus.NetVanta.service.MonitoringStatusService;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/monitoring")
@CrossOrigin(origins = "*")
public class MonitoringStatusController {

    private final MonitoringStatusService monitoringStatusService;

    public MonitoringStatusController(
            MonitoringStatusService monitoringStatusService) {

        this.monitoringStatusService =
                monitoringStatusService;
    }

    @GetMapping("/status")
    public Map<String, Object> getMonitoringStatus() {

        Map<String, Object> status =
                new LinkedHashMap<>();

        status.put(
                "active",
                monitoringStatusService.isActive()
        );

        status.put(
                "lastScan",
                monitoringStatusService.getLastScan()
        );

        status.put(
                "monitoredDevices",
                monitoringStatusService.getMonitoredDevices()
        );

        status.put(
                "scanInterval",
                monitoringStatusService.getScanInterval()
        );

        return status;
    }

    @PostMapping("/pause")
    public Map<String, Object> pauseMonitoring() {

        monitoringStatusService.setActive(false);

        return getMonitoringStatus();
    }

    @PostMapping("/resume")
    public Map<String, Object> resumeMonitoring() {

        monitoringStatusService.setActive(true);

        return getMonitoringStatus();
    }

    @PutMapping("/interval")
    public Map<String, Object> updateInterval(
            @RequestParam long seconds) {

        monitoringStatusService.setScanInterval(
                seconds * 1000
        );

        return getMonitoringStatus();
    }
}