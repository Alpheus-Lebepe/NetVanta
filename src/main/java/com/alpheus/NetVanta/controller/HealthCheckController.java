package com.alpheus.NetVanta.controller;

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
    public ResponseEntity<List<HealthCheck>> getHealthChecks(
            @PathVariable Long deviceId) {

        List<HealthCheck> healthChecks =
                healthCheckRepository
                        .findByDeviceIdOrderByCheckedAtDesc(deviceId);

        return ResponseEntity.ok(healthChecks);
    }
}