package com.alpheus.NetVanta.service;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class MonitoringStatusService {

    private boolean active = true;

    private LocalDateTime lastScan;

    private int monitoredDevices = 0;

    private long scanInterval = 60000;

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public LocalDateTime getLastScan() {
        return lastScan;
    }

    public void setLastScan(LocalDateTime lastScan) {
        this.lastScan = lastScan;
    }

    public int getMonitoredDevices() {
        return monitoredDevices;
    }

    public void setMonitoredDevices(int monitoredDevices) {
        this.monitoredDevices = monitoredDevices;
    }

    public long getScanInterval() {
        return scanInterval;
    }

    public void setScanInterval(long scanInterval) {

        if (scanInterval < 10000) {
            scanInterval = 10000;
        }

        this.scanInterval = scanInterval;
    }
}