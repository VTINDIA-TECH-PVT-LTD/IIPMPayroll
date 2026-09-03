package com.iipm.payroll.controller;

import com.iipm.payroll.dto.ApiResponse;
import com.iipm.payroll.model.Payroll;
import com.iipm.payroll.service.PayrollService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/payroll")
@CrossOrigin(origins = "*", maxAge = 3600)
public class PayrollController {

    @Autowired
    private PayrollService payrollService;

    @Autowired
    private com.iipm.payroll.service.TdsProjectionService tdsProjectionService;

    @PostMapping
    public ResponseEntity<ApiResponse<Payroll>> createPayroll(@RequestBody Map<String, Object> payrollData,
                                                             @RequestHeader("X-User-Id") String createdBy) {
        try {
            String userId = (String) payrollData.get("userId");
            int month = ((Number) payrollData.get("month")).intValue();
            int year = ((Number) payrollData.get("year")).intValue();
            double tds = ((Number) payrollData.get("tds")).doubleValue();
            double otherDeductions = payrollData.containsKey("otherDeductions") ?
                    ((Number) payrollData.get("otherDeductions")).doubleValue() : 0;

            Payroll payroll = payrollService.createPayroll(userId, month, year, tds, otherDeductions, createdBy);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Payroll created successfully", payroll));
        } catch (Exception e) {
            log.error("Error creating payroll", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error creating payroll: " + e.getMessage(), null));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Payroll>> getPayroll(@PathVariable String id) {
        try {
            Payroll payroll = payrollService.getPayrollById(id);
            return ResponseEntity.ok(ApiResponse.success("Payroll retrieved", payroll));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Payroll not found", null));
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<Payroll>>> getPayrollsByUser(@PathVariable String userId) {
        try {
            List<Payroll> payrolls = payrollService.getPayrollsByUser(userId);
            return ResponseEntity.ok(ApiResponse.success("Payrolls retrieved", payrolls));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error retrieving payrolls", null));
        }
    }

    @GetMapping("/month/{month}/year/{year}")
    public ResponseEntity<ApiResponse<List<Payroll>>> getPayrollsByMonth(@PathVariable int month, @PathVariable int year) {
        try {
            List<Payroll> payrolls = payrollService.getPayrollsByMonth(month, year);
            return ResponseEntity.ok(ApiResponse.success("Payrolls retrieved for " + month + "/" + year, payrolls));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error retrieving payrolls", null));
        }
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<ApiResponse<List<Payroll>>> getPayrollsByStatus(@PathVariable String status) {
        try {
            List<Payroll> payrolls = payrollService.getPayrollsByStatus(status);
            return ResponseEntity.ok(ApiResponse.success("Payrolls retrieved with status: " + status, payrolls));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error retrieving payrolls", null));
        }
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<Payroll>> approvePayroll(@PathVariable String id,
                                                              @RequestHeader("X-User-Id") String approvedBy) {
        try {
            Payroll payroll = payrollService.approvePayroll(id, approvedBy);
            return ResponseEntity.ok(ApiResponse.success("Payroll approved successfully", payroll));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error approving payroll: " + e.getMessage(), null));
        }
    }

    @PutMapping(value = "/{id}/reject", consumes = {"multipart/form-data"})
    public ResponseEntity<ApiResponse<Payroll>> rejectPayroll(@PathVariable String id,
                                                             @RequestParam("reason") String reason,
                                                             @RequestParam(value = "files", required = false) org.springframework.web.multipart.MultipartFile[] files,
                                                             @RequestHeader("X-User-Id") String updatedBy) {
        try {
            List<String> attachmentNames = new java.util.ArrayList<>();
            if (files != null) {
                for (org.springframework.web.multipart.MultipartFile file : files) {
                    String base64 = java.util.Base64.getEncoder().encodeToString(file.getBytes());
                    String type = file.getContentType();
                    attachmentNames.add(file.getOriginalFilename() + "|data:" + type + ";base64," + base64);
                }
            }
            
            Payroll payroll = payrollService.rejectPayroll(id, reason, updatedBy, attachmentNames);
            return ResponseEntity.ok(ApiResponse.success("Payroll rejected", payroll));
        } catch (Exception e) {
            log.error("Error rejecting payroll", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error rejecting payroll: " + e.getMessage(), null));
        }
    }

    @PutMapping("/{id}/lock")
    public ResponseEntity<ApiResponse<Payroll>> lockPayroll(@PathVariable String id,
                                                           @RequestHeader("X-User-Id") String lockedBy) {
        try {
            Payroll payroll = payrollService.lockPayroll(id, lockedBy);
            return ResponseEntity.ok(ApiResponse.success("Payroll locked successfully", payroll));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error locking payroll", null));
        }
    }

    @PostMapping("/bulk-approve")
    public ResponseEntity<ApiResponse<List<Payroll>>> bulkApprovePayroll(@RequestBody List<String> ids,
                                                                        @RequestHeader("X-User-Id") String approvedBy) {
        try {
            List<Payroll> payrolls = payrollService.approveBulkPayroll(ids, approvedBy);
            return ResponseEntity.ok(ApiResponse.success("Payrolls approved successfully", payrolls));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error approving payrolls: " + e.getMessage(), null));
        }
    }

    @PostMapping("/bulk-reject")
    public ResponseEntity<ApiResponse<List<Payroll>>> bulkRejectPayroll(@RequestBody Map<String, Object> payload,
                                                                       @RequestHeader("X-User-Id") String updatedBy) {
        try {
            @SuppressWarnings("unchecked")
            List<String> ids = (List<String>) payload.get("ids");
            String reason = payload.containsKey("reason") ? (String) payload.get("reason") : "Bulk rejected";
            List<Payroll> payrolls = payrollService.rejectBulkPayroll(ids, reason, updatedBy);
            return ResponseEntity.ok(ApiResponse.success("Payrolls rejected successfully", payrolls));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error rejecting payrolls: " + e.getMessage(), null));
        }
    }

    @GetMapping("/user/{userId}/year/{year}")
    public ResponseEntity<ApiResponse<List<Payroll>>> getPayrollsByYear(@PathVariable String userId,
                                                                        @PathVariable int year) {
        try {
            List<Payroll> payrolls = payrollService.getPayrollsByYear(userId, year);
            return ResponseEntity.ok(ApiResponse.success("Payrolls retrieved for year " + year, payrolls));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error retrieving payrolls", null));
        }
    }

    @GetMapping("/user/{userId}/comparison")
    public ResponseEntity<ApiResponse<Map<String, Double>>> getYearComparison(@PathVariable String userId) {
        try {
            Map<String, Double> comparison = payrollService.getYearComparison(userId);
            return ResponseEntity.ok(ApiResponse.success("Year comparison retrieved", comparison));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error retrieving comparison", null));
        }
    }

    @PostMapping("/bulk")
    public ResponseEntity<ApiResponse<List<Payroll>>> createBulkPayroll(@RequestBody Map<String, Object> bulkData,
                                                                         @RequestHeader("X-User-Id") String createdBy) {
        try {
            String department = (String) bulkData.getOrDefault("department", "");
            String payLevel = (String) bulkData.getOrDefault("payLevel", "");
            int month = ((Number) bulkData.get("month")).intValue();
            int year = ((Number) bulkData.get("year")).intValue();

            @SuppressWarnings("unchecked")
            Map<String, Object> tdsRaw = (Map<String, Object>) bulkData.getOrDefault("tdsMap", new java.util.HashMap<>());
            Map<String, Double> tdsMap = new java.util.HashMap<>();
            tdsRaw.forEach((k, v) -> tdsMap.put(k, ((Number) v).doubleValue()));

            @SuppressWarnings("unchecked")
            Map<String, Object> otherDedRaw = (Map<String, Object>) bulkData.getOrDefault("otherDeductionsMap", new java.util.HashMap<>());
            Map<String, Double> otherDeductionsMap = new java.util.HashMap<>();
            otherDedRaw.forEach((k, v) -> otherDeductionsMap.put(k, ((Number) v).doubleValue()));

            @SuppressWarnings("unchecked")
            Map<String, Object> remarksRaw = (Map<String, Object>) bulkData.getOrDefault("remarksMap", new java.util.HashMap<>());
            Map<String, String> remarksMap = new java.util.HashMap<>();
            remarksRaw.forEach((k, v) -> remarksMap.put(k, String.valueOf(v)));

            List<Payroll> payrolls = payrollService.createBulkPayroll(department, payLevel, month, year, tdsMap, otherDeductionsMap, remarksMap, createdBy);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Bulk payroll created: " + payrolls.size() + " records", payrolls));
        } catch (Exception e) {
            log.error("Error in bulk payroll creation", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Bulk payroll error: " + e.getMessage(), null));
        }
    }

    @PostMapping("/bulk/preview")
    public ResponseEntity<ApiResponse<List<Payroll>>> previewBulkPayroll(@RequestBody Map<String, Object> bulkData) {
        try {
            String department = (String) bulkData.getOrDefault("department", "");
            String payLevel = (String) bulkData.getOrDefault("payLevel", "");
            int month = ((Number) bulkData.get("month")).intValue();
            int year = ((Number) bulkData.get("year")).intValue();
            List<Payroll> payrolls = payrollService.previewBulkPayroll(department, payLevel, month, year);
            return ResponseEntity.ok(ApiResponse.success("Preview generated", payrolls));
        } catch (Exception e) {
            log.error("Error in preview", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Preview error", null));
        }
    }

    @GetMapping("/department/{department}/month/{month}/year/{year}")
    public ResponseEntity<ApiResponse<List<Payroll>>> getPayrollsByDepartment(@PathVariable String department,
                                                                                @PathVariable int month,
                                                                                @PathVariable int year) {
        try {
            List<Payroll> all = payrollService.getPayrollsByMonth(month, year);
            return ResponseEntity.ok(ApiResponse.success("Payrolls retrieved", all));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error retrieving payrolls", null));
        }
    }

    @GetMapping("/tds-projection/{userId}/{year}")
    public ResponseEntity<ApiResponse<com.iipm.payroll.dto.TdsProjectionDTO>> getTdsProjection(
            @PathVariable String userId,
            @PathVariable int year) {
        try {
            com.iipm.payroll.dto.TdsProjectionDTO dto = tdsProjectionService.calculateTdsProjection(userId, year);
            return ResponseEntity.ok(ApiResponse.success("TDS projection calculated successfully", dto));
        } catch (Exception e) {
            log.error("Error calculating TDS projection for user: {}", userId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error calculating TDS projection: " + e.getMessage(), null));
        }
    }

    @GetMapping("/tds-projections/{year}")
    public ResponseEntity<ApiResponse<List<com.iipm.payroll.dto.TdsProjectionDTO>>> getAllTdsProjections(
            @PathVariable int year) {
        try {
            List<com.iipm.payroll.dto.TdsProjectionDTO> list = tdsProjectionService.calculateAllTdsProjections(year);
            return ResponseEntity.ok(ApiResponse.success("All TDS projections calculated successfully", list));
        } catch (Exception e) {
            log.error("Error calculating all TDS projections", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error calculating all TDS projections: " + e.getMessage(), null));
        }
    }
}
