package com.iipm.payroll.controller;

import com.iipm.payroll.dto.ApiResponse;
import com.iipm.payroll.service.DataManagementService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequestMapping("/api/data")
@CrossOrigin(origins = "*", maxAge = 3600)
public class DataManagementController {

    @Autowired
    private DataManagementService dataManagementService;

    @PostMapping("/import/employees")
    public ResponseEntity<ApiResponse<String>> importEmployees(@RequestParam("file") MultipartFile file) {
        try {
            String message = dataManagementService.importEmployeesFromExcel(file);
            return ResponseEntity.ok(ApiResponse.success(message, null));
        } catch (Exception e) {
            log.error("Failed to import employees", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to import employees: " + e.getMessage(), null));
        }
    }

    @GetMapping("/export/salary-register/{month}/{year}")
    public ResponseEntity<byte[]> exportSalaryRegister(@PathVariable int month, @PathVariable int year) {
        try {
            byte[] fileContent = dataManagementService.exportSalaryRegister(month, year);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.add("Content-Disposition", "attachment; filename=Salary_Register_" + month + "_" + year + ".xlsx");
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(fileContent);
        } catch (Exception e) {
            log.error("Failed to export salary register", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
}
