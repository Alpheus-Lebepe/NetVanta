package com.alpheus.NetVanta.dto;

import com.alpheus.NetVanta.entity.DeviceStatus;

import java.time.LocalDateTime;

public class HealthCheckResponse {

    private Long id;
    private DeviceStatus status;
    private Long responseTime;
    private LocalDateTime checkedAt;

    public HealthCheckResponse(
            Long id,
            DeviceStatus status,
            Long responseTime,
            LocalDateTime checkedAt) {

        this.id = id;
        this.status = status;
        this.responseTime = responseTime;
        this.checkedAt = checkedAt;
    }

    public Long getId() {
        return id;
    }

    public DeviceStatus getStatus() {
        return status;
    }

    public Long getResponseTime() {
        return responseTime;
    }

    public LocalDateTime getCheckedAt() {
        return checkedAt;
    }
}