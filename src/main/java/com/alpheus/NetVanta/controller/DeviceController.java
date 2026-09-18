package com.alpheus.NetVanta.controller;

import com.alpheus.NetVanta.entity.Device;
import com.alpheus.NetVanta.service.DeviceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.alpheus.NetVanta.service.NetworkMonitorService;

import java.util.List;

@RestController
@RequestMapping("/api/devices")
@CrossOrigin(origins = "*")
public class DeviceController {

    private final DeviceService deviceService;
    private final NetworkMonitorService networkMonitorService;

    public DeviceController(
        DeviceService deviceService,
        NetworkMonitorService networkMonitorService) {

    this.deviceService = deviceService;
    this.networkMonitorService = networkMonitorService;
}

    @GetMapping
    public List<Device> getAllDevices() {
        return deviceService.getAllDevices();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Device> getDeviceById(@PathVariable Long id) {

        return deviceService.getDeviceById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Device> createDevice(@RequestBody Device device) {
        return ResponseEntity.ok(deviceService.createDevice(device));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Device> updateDevice(
            @PathVariable Long id,
            @RequestBody Device device) {

        return ResponseEntity.ok(
                deviceService.updateDevice(id, device)
        );
    }

    @PostMapping("/{id}/check")
    public ResponseEntity<Device> checkDevice(@PathVariable Long id) {

    Device device = networkMonitorService.checkDevice(id);

    return ResponseEntity.ok(device);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDevice(@PathVariable Long id) {

        deviceService.deleteDevice(id);

        return ResponseEntity.noContent().build();
    }
}
