package com.sample.ecommerce.demo;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/demo")
public class DemoResetController {

    private final DemoResetService demoResetService;

    public DemoResetController(DemoResetService demoResetService) {
        this.demoResetService = demoResetService;
    }

    @PostMapping("/reset")
    public DemoResetService.DemoResetResponse reset() throws Exception {
        return demoResetService.reset();
    }
}
