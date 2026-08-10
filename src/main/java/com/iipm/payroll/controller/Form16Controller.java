package com.iipm.payroll.controller;

import com.iipm.payroll.dto.ApiResponse;
import com.iipm.payroll.dto.Form16DTO;
import com.iipm.payroll.service.Form16Service;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/form16")
@CrossOrigin(origins = "*", maxAge = 3600)
public class Form16Controller {

    @Autowired
    private Form16Service form16Service;

    @GetMapping("/{userId}/{year}")
    public ResponseEntity<ApiResponse<Form16DTO>> getForm16(
            @PathVariable String userId,
            @PathVariable int year) {
        try {
            Form16DTO dto = form16Service.generateForm16(userId, year);
            return ResponseEntity.ok(ApiResponse.success("Form 16 generated successfully", dto));
        } catch (Exception e) {
            log.error("Error generating Form 16", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error generating Form 16: " + e.getMessage(), null));
        }
    }
}
