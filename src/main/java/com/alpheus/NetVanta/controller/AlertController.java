package com.alpheus.NetVanta.controller;

import com.alpheus.NetVanta.dto.AlertResponse;
import com.alpheus.NetVanta.entity.Alert;
import com.alpheus.NetVanta.entity.AlertStatus;
import com.alpheus.NetVanta.repository.AlertRepository;
import com.alpheus.NetVanta.service.AlertService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alerts")
@CrossOrigin(origins = "*")
public class AlertController {

        private final AlertRepository alertRepository;
        private final AlertService alertService;

        public AlertController(
                        AlertRepository alertRepository,
                        AlertService alertService) {

                this.alertRepository = alertRepository;
                this.alertService = alertService;
        }

        @GetMapping
        public ResponseEntity<List<AlertResponse>> getAllAlerts() {

                List<Alert> alerts = alertRepository
                                .findAllByOrderByCreatedAtDesc();

                return ResponseEntity.ok(
                                alerts.stream()
                                                .map(this::convertToResponse)
                                                .toList());
        }

        @GetMapping("/status/{status}")
        public ResponseEntity<List<AlertResponse>> getAlertsByStatus(
                        @PathVariable AlertStatus status) {

                List<Alert> alerts = alertRepository
                                .findByStatusOrderByCreatedAtDesc(
                                                status);

                return ResponseEntity.ok(
                                alerts.stream()
                                                .map(this::convertToResponse)
                                                .toList());
        }

        @GetMapping("/device/{deviceId}")
        public ResponseEntity<List<AlertResponse>> getDeviceAlerts(
                        @PathVariable Long deviceId) {

                List<Alert> alerts = alertRepository
                                .findByDeviceIdOrderByCreatedAtDesc(
                                                deviceId);

                return ResponseEntity.ok(
                                alerts.stream()
                                                .map(this::convertToResponse)
                                                .toList());
        }

        @GetMapping("/count/{status}")
        public ResponseEntity<Long> countAlertsByStatus(
                        @PathVariable AlertStatus status) {

                return ResponseEntity.ok(
                                alertRepository.countByStatus(status));
        }

        @PostMapping("/{id}/acknowledge")
        public ResponseEntity<AlertResponse> acknowledgeAlert(
                        @PathVariable Long id) {

                Alert alert = alertService.acknowledgeAlert(id);

                return ResponseEntity.ok(
                                convertToResponse(alert));
        }

        @PostMapping("/{id}/resolve")
        public ResponseEntity<AlertResponse> resolveAlert(
                        @PathVariable Long id) {

                Alert alert = alertService.resolveAlert(id);

                return ResponseEntity.ok(
                                convertToResponse(alert));
        }

        private AlertResponse convertToResponse(
                        Alert alert) {

                return new AlertResponse(
                                alert.getId(),
                                alert.getDevice().getId(),
                                alert.getDevice().getName(),
                                alert.getDevice().getIpAddress(),
                                alert.getEventType(),
                                alert.getSeverity(),
                                alert.getStatus(),
                                alert.getMessage(),
                                alert.getCreatedAt(),
                                alert.getAcknowledgedAt(),
                                alert.getResolvedAt());
        }
}