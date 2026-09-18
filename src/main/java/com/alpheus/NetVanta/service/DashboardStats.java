package com.alpheus.NetVanta.service;

public class DashboardStats {

    private long totalDevices;
    private long onlineDevices;
    private long offlineDevices;
    private long unknownDevices;
    private double averageResponseTime;

    public DashboardStats(
            long totalDevices,
            long onlineDevices,
            long offlineDevices,
            long unknownDevices,
            double averageResponseTime) {

        this.totalDevices = totalDevices;
        this.onlineDevices = onlineDevices;
        this.offlineDevices = offlineDevices;
        this.unknownDevices = unknownDevices;
        this.averageResponseTime = averageResponseTime;
    }

    public long getTotalDevices() {
        return totalDevices;
    }

    public long getOnlineDevices() {
        return onlineDevices;
    }

    public long getOfflineDevices() {
        return offlineDevices;
    }

    public long getUnknownDevices() {
        return unknownDevices;
    }

    public double getAverageResponseTime() {
        return averageResponseTime;
    }
}