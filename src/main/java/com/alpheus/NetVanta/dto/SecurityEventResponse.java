package com.alpheus.NetVanta.dto;

import com.alpheus.NetVanta.entity.SecurityEventSeverity;
import com.alpheus.NetVanta.entity.SecurityEventType;

import java.time.LocalDateTime;

public class SecurityEventResponse {

    private Long id;

    private Long deviceId;

    private String deviceName;

    private String ipAddress;

    private SecurityEventType eventType;

    private SecurityEventSeverity severity;

    private String message;

    private LocalDateTime createdAt;

    public SecurityEventResponse(
            Long id,
            Long deviceId,
            String deviceName,
            String ipAddress,
            SecurityEventType eventType,
            SecurityEventSeverity severity,
            String message,
            LocalDateTime createdAt) {

        this.id = id;
        this.deviceId = deviceId;
        this.deviceName = deviceName;
        this.ipAddress = ipAddress;
        this.eventType = eventType;
        this.severity = severity;
        this.message = message;
        this.createdAt = createdAt;
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

    public String getMessage() {
        return message;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}