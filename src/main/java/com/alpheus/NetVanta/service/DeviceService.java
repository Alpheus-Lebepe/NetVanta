package com.alpheus.NetVanta.service;

import com.alpheus.NetVanta.entity.Device;
import com.alpheus.NetVanta.repository.DeviceRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class DeviceService {

    private final DeviceRepository deviceRepository;

    public DeviceService(DeviceRepository deviceRepository) {
        this.deviceRepository = deviceRepository;
    }

    public List<Device> getAllDevices() {
        return deviceRepository.findAll();
    }

    public Optional<Device> getDeviceById(Long id) {
        return deviceRepository.findById(id);
    }

    public Device createDevice(Device device) {
        return deviceRepository.save(device);
    }

    public Device updateDevice(Long id, Device updatedDevice) {

        return deviceRepository.findById(id)
                .map(device -> {

                    device.setName(updatedDevice.getName());
                    device.setIpAddress(updatedDevice.getIpAddress());
                    device.setDeviceType(updatedDevice.getDeviceType());
                    device.setLocation(updatedDevice.getLocation());

                    return deviceRepository.save(device);
                })
                .orElseThrow(() ->
                        new RuntimeException("Device not found with ID: " + id));
    }

    public void deleteDevice(Long id) {
        deviceRepository.deleteById(id);
    }
}