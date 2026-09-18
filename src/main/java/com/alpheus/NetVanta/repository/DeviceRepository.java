package com.alpheus.NetVanta.repository;

import com.alpheus.NetVanta.entity.Device;
import com.alpheus.NetVanta.entity.DeviceStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeviceRepository extends JpaRepository<Device, Long> {

    long countByStatus(DeviceStatus status);
}