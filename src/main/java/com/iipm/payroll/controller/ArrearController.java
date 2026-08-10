package com.iipm.payroll.controller;

import com.iipm.payroll.dto.ApiResponse;
import com.iipm.payroll.model.Arrear;
import com.iipm.payroll.service.ArrearService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/arrears")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ArrearController {

    @Autowired
    private ArrearService arrearService;

    @PostMapping("/da")
    public ResponseEntity<ApiResponse<Arrear>> createDAArear(@RequestBody Map<String, Object> arrearData,
                                                            @RequestHeader("X-User-Id") String createdBy) {
        try {
            String userId = (String) arrearData.get("userId");
            int fromMonth = ((Number) arrearData.get("fromMonth")).intValue();
            int fromYear = ((Number) arrearData.get("fromYear")).intValue();
            int toMonth = ((Number) arrearData.get("toMonth")).intValue();
            int toYear = ((Number) arrearData.get("toYear")).intValue();
            double oldDA = ((Number) arrearData.get("oldDAPercentage")).doubleValue();
            double newDA = ((Number) arrearData.get("newDAPercentage")).doubleValue();

            Arrear arrear = arrearService.createDAArear(userId, fromMonth, fromYear, toMonth, toYear, oldDA, newDA, createdBy);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("DA Arrear created successfully", arrear));
        } catch (Exception e) {
            log.error("Error creating DA arrear", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error creating arrear: " + e.getMessage(), null));
        }
    }

    @PostMapping("/promotion")
    public ResponseEntity<ApiResponse<Arrear>> createPromotionArrear(@RequestBody Map<String, Object> arrearData,
                                                                    @RequestHeader("X-User-Id") String createdBy) {
        try {
            String userId = (String) arrearData.get("userId");
            double oldPay = ((Number) arrearData.get("oldBasicPay")).doubleValue();
            double newPay = ((Number) arrearData.get("newBasicPay")).doubleValue();
            int daysWorked = ((Number) arrearData.get("daysWorked")).intValue();
            int totalDays = ((Number) arrearData.get("totalDays")).intValue();

            Arrear arrear = arrearService.createPromotionArrear(userId, oldPay, newPay, daysWorked, totalDays, createdBy);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Promotion Arrear created successfully", arrear));
        } catch (Exception e) {
            log.error("Error creating promotion arrear", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error creating arrear: " + e.getMessage(), null));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Arrear>> getArrear(@PathVariable String id) {
        try {
            Arrear arrear = arrearService.getArrearById(id);
            return ResponseEntity.ok(ApiResponse.success("Arrear retrieved", arrear));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Arrear not found", null));
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<Arrear>>> getArrearsByUser(@PathVariable String userId) {
        try {
            List<Arrear> arrears = arrearService.getArrearsByUser(userId);
            return ResponseEntity.ok(ApiResponse.success("Arrears retrieved", arrears));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error retrieving arrears", null));
        }
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<ApiResponse<List<Arrear>>> getArrearsByType(@PathVariable String type) {
        try {
            List<Arrear> arrears = arrearService.getArrearsByType(type);
            return ResponseEntity.ok(ApiResponse.success("Arrears retrieved for type: " + type, arrears));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error retrieving arrears", null));
        }
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<Arrear>>> getPendingArrears() {
        try {
            List<Arrear> arrears = arrearService.getPendingArrears();
            return ResponseEntity.ok(ApiResponse.success("Pending arrears retrieved", arrears));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error retrieving pending arrears", null));
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Arrear>>> getAllArrears() {
        try {
            List<Arrear> arrears = arrearService.getAllArrears();
            return ResponseEntity.ok(ApiResponse.success("All arrears retrieved", arrears));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error retrieving arrears", null));
        }
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<Arrear>> approveArrear(@PathVariable String id,
                                                            @RequestHeader("X-User-Id") String approvedBy) {
        try {
            Arrear arrear = arrearService.approveArrear(id, approvedBy);
            return ResponseEntity.ok(ApiResponse.success("Arrear approved successfully", arrear));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error approving arrear", null));
        }
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<Arrear>> rejectArrear(@PathVariable String id,
                                                           @RequestBody Map<String, String> rejectData,
                                                           @RequestHeader("X-User-Id") String updatedBy) {
        try {
            String reason = rejectData.get("reason");
            Arrear arrear = arrearService.rejectArrear(id, reason, updatedBy);
            return ResponseEntity.ok(ApiResponse.success("Arrear rejected", arrear));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error rejecting arrear", null));
        }
    }

    @PutMapping("/{id}/paid")
    public ResponseEntity<ApiResponse<Arrear>> markAsPaid(@PathVariable String id,
                                                         @RequestHeader("X-User-Id") String paidBy) {
        try {
            Arrear arrear = arrearService.markAsPaid(id, paidBy);
            return ResponseEntity.ok(ApiResponse.success("Arrear marked as paid", arrear));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error marking arrear as paid", null));
        }
    }
}
