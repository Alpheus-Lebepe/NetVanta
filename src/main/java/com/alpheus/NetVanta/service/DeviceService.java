package com.alpheus.NetVanta.service;

import com.alpheus.NetVanta.entity.Device;
import com.alpheus.NetVanta.repository.DeviceRepository;
import com.alpheus.NetVanta.repository.HealthCheckRepository;
import com.alpheus.NetVanta.repository.SecurityEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final HealthCheckRepository healthCheckRepository;
    private final SecurityEventRepository securityEventRepository;

    public DeviceService(
            DeviceRepository deviceRepository,
            HealthCheckRepository healthCheckRepository,
            SecurityEventRepository securityEventRepository) {

        this.deviceRepository = deviceRepository;
        this.healthCheckRepository = healthCheckRepository;
        this.securityEventRepository = securityEventRepository;
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

    public Device updateDevice(
            Long id,
            Device updatedDevice) {

        return deviceRepository.findById(id)
                .map(device -> {

                    device.setName(
                            updatedDevice.getName()
                    );

                    device.setIpAddress(
                            updatedDevice.getIpAddress()
                    );

                    device.setDeviceType(
                            updatedDevice.getDeviceType()
                    );

                    device.setLocation(
                            updatedDevice.getLocation()
                    );

                    return deviceRepository.save(device);
                })
                .orElseThrow(() ->
                        new RuntimeException(
                                "Device not found with ID: " + id
                        ));
    }

    @Transactional
    public void deleteDevice(Long id) {

        if (!deviceRepository.existsById(id)) {

            throw new RuntimeException(
                    "Device not found with ID: " + id
            );
        }

        /*
         * Delete monitoring records first.
         */
        healthCheckRepository.deleteByDeviceId(id);

        /*
         * Delete security events associated
         * with the device.
         */
        securityEventRepository.deleteByDeviceId(id);

        /*
         * Finally delete the device itself.
         */
        deviceRepository.deleteById(id);
    }
}