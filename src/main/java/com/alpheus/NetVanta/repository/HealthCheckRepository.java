package com.alpheus.NetVanta.repository;

import com.alpheus.NetVanta.entity.HealthCheck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface HealthCheckRepository extends JpaRepository<HealthCheck, Long> {

    List<HealthCheck> findByDeviceIdOrderByCheckedAtDesc(Long deviceId);

    @Query("SELECT COALESCE(AVG(h.responseTime), 0) FROM HealthCheck h")
    Double getAverageResponseTime();

    void deleteByDeviceId(Long deviceId);
}