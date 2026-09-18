package com.alpheus.NetVanta.controller;

import com.alpheus.NetVanta.service.DashboardService;
import com.alpheus.NetVanta.service.DashboardStats;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/stats")
    public DashboardStats getDashboardStats() {
        return dashboardService.getDashboardStats();
    }
}