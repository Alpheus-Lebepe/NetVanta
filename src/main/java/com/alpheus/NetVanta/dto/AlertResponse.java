package com.alpheus.NetVanta.dto;

import com.alpheus.NetVanta.entity.AlertStatus;
import com.alpheus.NetVanta.entity.SecurityEventSeverity;
import com.alpheus.NetVanta.entity.SecurityEventType;

import java.time.LocalDateTime;

public class AlertResponse {

    private Long id;
    private Long deviceId;
    private String deviceName;
    private String ipAddress;
    private SecurityEventType eventType;
    private SecurityEventSeverity severity;
    private AlertStatus status;
    private String message;
    private LocalDateTime createdAt;
    private LocalDateTime acknowledgedAt;
    private LocalDateTime resolvedAt;

    public AlertResponse(
            Long id,
            Long deviceId,
            String deviceName,
            String ipAddress,
            SecurityEventType eventType,
            SecurityEventSeverity severity,
            AlertStatus status,
            String message,
            LocalDateTime createdAt,
            LocalDateTime acknowledgedAt,
            LocalDateTime resolvedAt) {

        this.id = id;
        this.deviceId = deviceId;
        this.deviceName = deviceName;
        this.ipAddress = ipAddress;
        this.eventType = eventType;
        this.severity = severity;
        this.status = status;
        this.message = message;
        this.createdAt = createdAt;
        this.acknowledgedAt = acknowledgedAt;
        this.resolvedAt = resolvedAt;
    }

    public Long getId() {
        return id;
    }

    public Long getDeviceId() {
        return deviceId;
    }

    public String getDeviceName() {
        return deviceName;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public SecurityEventType getEventType() {
        return eventType;
    }

    public SecurityEventSeverity getSeverity() {
        return severity;
    }

    public AlertStatus getStatus() {
        return status;
    }

    public String getMessage() {
        return message;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getAcknowledgedAt() {
        return acknowledgedAt;
    }

    public LocalDateTime getResolvedAt() {
        return resolvedAt;
    }
}