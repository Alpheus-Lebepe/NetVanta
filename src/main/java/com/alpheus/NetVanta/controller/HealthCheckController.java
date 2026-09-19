package com.alpheus.NetVanta.controller;

import com.alpheus.NetVanta.dto.HealthCheckResponse;
import com.alpheus.NetVanta.entity.HealthCheck;
import com.alpheus.NetVanta.repository.HealthCheckRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/devices")
@CrossOrigin(origins = "*")
public class HealthCheckController {

    private final HealthCheckRepository healthCheckRepository;

    public HealthCheckController(
            HealthCheckRepository healthCheckRepository) {

        this.healthCheckRepository = healthCheckRepository;
    }

    @GetMapping("/{deviceId}/health-checks")
    public ResponseEntity<List<HealthCheckResponse>> getHealthChecks(
            @PathVariable Long deviceId) {

        List<HealthCheck> healthChecks =
                healthCheckRepository
                        .findByDeviceIdOrderByCheckedAtDesc(deviceId);

        List<HealthCheckResponse> response =
                healthChecks.stream()
                        .map(this::convertToResponse)
                        .toList();

        return ResponseEntity.ok(response);
    }

    private HealthCheckResponse convertToResponse(
            HealthCheck healthCheck) {

        return new HealthCheckResponse(
                healthCheck.getId(),
                healthCheck.getStatus(),
                healthCheck.getResponseTime(),
                healthCheck.getCheckedAt()
        );
    }
}