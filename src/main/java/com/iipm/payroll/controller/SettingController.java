package com.iipm.payroll.controller;

import com.iipm.payroll.dto.ApiResponse;
import com.iipm.payroll.model.Setting;
import com.iipm.payroll.service.SettingService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/settings")
@CrossOrigin(origins = "*", maxAge = 3600)
public class SettingController {

    @Autowired
    private SettingService settingService;

    @PostMapping
    public ResponseEntity<ApiResponse<Setting>> createSetting(@RequestBody Map<String, String> settingData,
                                                             @RequestHeader("X-User-Id") String createdBy) {
        try {
            String key = settingData.get("key");
            String value = settingData.get("value");
            String dataType = settingData.get("dataType");
            String category = settingData.get("category");
            String description = settingData.get("description");

            Setting setting = settingService.createSetting(key, value, dataType, category, description);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Setting created successfully", setting));
        } catch (Exception e) {
            log.error("Error creating setting", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error creating setting: " + e.getMessage(), null));
        }
    }

    @GetMapping("/{key}")
    public ResponseEntity<ApiResponse<Setting>> getSetting(@PathVariable String key) {
        try {
            Setting setting = settingService.getSettingByKey(key);
            return ResponseEntity.ok(ApiResponse.success("Setting retrieved", setting));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Setting not found: " + key, null));
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Setting>>> getAllSettings() {
        try {
            List<Setting> settings = settingService.getAllSettings();
            return ResponseEntity.ok(ApiResponse.success("Settings retrieved", settings));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error retrieving settings", null));
        }
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<ApiResponse<List<Setting>>> getSettingsByCategory(@PathVariable String category) {
        try {
            List<Setting> settings = settingService.getSettingsByCategory(category);
            return ResponseEntity.ok(ApiResponse.success("Settings retrieved for category: " + category, settings));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error retrieving settings", null));
        }
    }

    @PutMapping("/{key}")
    public ResponseEntity<ApiResponse<Setting>> updateSetting(@PathVariable String key,
                                                             @RequestBody Map<String, String> updateData,
                                                             @RequestHeader("X-User-Id") String updatedBy) {
        try {
            String newValue = updateData.get("value");
            Setting setting = settingService.updateSetting(key, newValue, updatedBy);
            return ResponseEntity.ok(ApiResponse.success("Setting updated successfully", setting));
        } catch (Exception e) {
            log.error("Error updating setting", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error updating setting: " + e.getMessage(), null));
        }
    }

    @DeleteMapping("/{key}")
    public ResponseEntity<ApiResponse<String>> deactivateSetting(@PathVariable String key) {
        try {
            settingService.deactivateSetting(key);
            return ResponseEntity.ok(ApiResponse.success("Setting deactivated successfully", ""));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error deactivating setting", null));
        }
    }

    @GetMapping("/payroll/all")
    public ResponseEntity<ApiResponse<Map<String, Double>>> getAllPayrollSettings() {
        try {
            Map<String, Double> settings = settingService.getAllPayrollSettings();
            return ResponseEntity.ok(ApiResponse.success("Payroll settings retrieved", settings));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error retrieving settings", null));
        }
    }

    @PostMapping("/initialize")
    public ResponseEntity<ApiResponse<String>> initializeDefaultSettings(@RequestHeader("X-User-Id") String createdBy) {
        try {
            settingService.initializeDefaultSettings();
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Default settings initialized", ""));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error initializing settings", null));
        }
    }
}
