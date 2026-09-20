package com.alpheus.NetVanta.controller;

import com.alpheus.NetVanta.dto.SecurityEventResponse;
import com.alpheus.NetVanta.entity.SecurityEvent;
import com.alpheus.NetVanta.repository.SecurityEventRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/security-events")
@CrossOrigin(origins = "*")
public class SecurityEventController {

    private final SecurityEventRepository securityEventRepository;

    public SecurityEventController(
            SecurityEventRepository securityEventRepository) {

        this.securityEventRepository =
                securityEventRepository;
    }

    @GetMapping
    public ResponseEntity<List<SecurityEventResponse>> getAllEvents() {

        List<SecurityEvent> events =
                securityEventRepository
                        .findAllByOrderByCreatedAtDesc();

        List<SecurityEventResponse> response =
                events.stream()
                        .map(this::convertToResponse)
                        .toList();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/device/{deviceId}")
    public ResponseEntity<List<SecurityEventResponse>> getDeviceEvents(
            @PathVariable Long deviceId) {

        List<SecurityEvent> events =
                securityEventRepository
                        .findByDeviceIdOrderByCreatedAtDesc(deviceId);

        List<SecurityEventResponse> response =
                events.stream()
                        .map(this::convertToResponse)
                        .toList();

        return ResponseEntity.ok(response);
    }

    private SecurityEventResponse convertToResponse(
            SecurityEvent event) {

        return new SecurityEventResponse(
                event.getId(),
                event.getDevice().getId(),
                event.getDevice().getName(),
                event.getDevice().getIpAddress(),
                event.getEventType(),
                event.getSeverity(),
                event.getMessage(),
                event.getCreatedAt()
        );
    }
}