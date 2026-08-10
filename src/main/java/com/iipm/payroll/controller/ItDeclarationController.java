package com.iipm.payroll.controller;

import com.iipm.payroll.model.ItDeclaration;
import com.iipm.payroll.model.User;
import com.iipm.payroll.service.ItDeclarationService;
import com.iipm.payroll.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.iipm.payroll.dto.ApiResponse;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/it-declarations")
public class ItDeclarationController {

    @Autowired
    private ItDeclarationService itDeclarationService;

    @Autowired
    private UserService userService;

    private Map<String, Object> enrich(ItDeclaration d) {
        Map<String, Object> item = new HashMap<>();
        item.put("id", d.getId());
        item.put("userId", d.getUserId());
        item.put("financialYear", d.getFinancialYear());
        item.put("section80C", d.getSection80C());
        item.put("section80D", d.getSection80D());
        item.put("hraExemption", d.getHraExemption());
        item.put("homeLoanInterest", d.getHomeLoanInterest());
        item.put("status", d.getStatus());
        item.put("taxRegime", d.getTaxRegime());
        item.put("rejectionReason", d.getRejectionReason());
        item.put("reviewedBy", d.getReviewedBy());
        item.put("reviewedAt", d.getReviewedAt());
        item.put("createdAt", d.getCreatedAt());
        try {
            User user = userService.getUserById(d.getUserId());
            item.put("employeeName", user.getFirstName() + " " + (user.getLastName() != null ? user.getLastName() : ""));
            item.put("employeeId", user.getEmployeeId());
            item.put("department", user.getDepartment());
            item.put("designation", user.getDesignation());
        } catch (Exception ex) {
            item.put("employeeName", d.getUserId());
            item.put("employeeId", d.getUserId());
        }
        return item;
    }

    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllDeclarations() {
        List<ItDeclaration> declarations = itDeclarationService.getAll();
        List<Map<String, Object>> enriched = new ArrayList<>();
        for (ItDeclaration d : declarations) enriched.add(enrich(d));
        return ResponseEntity.ok(ApiResponse.success("All declarations fetched", enriched));
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPendingDeclarations() {
        List<ItDeclaration> declarations = itDeclarationService.getPendingDeclarations();
        List<Map<String, Object>> enriched = new ArrayList<>();
        for (ItDeclaration d : declarations) enriched.add(enrich(d));
        return ResponseEntity.ok(ApiResponse.success("Pending declarations fetched successfully", enriched));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<List<ItDeclaration>> getItDeclarationsByUserId(@PathVariable String userId) {
        return ResponseEntity.ok(itDeclarationService.getByUserId(userId));
    }

    @GetMapping("/year/{userId}/{financialYear}")
    public ResponseEntity<ApiResponse<ItDeclaration>> getItDeclarationByYear(@PathVariable String userId, @PathVariable String financialYear) {
        return itDeclarationService.getByUserIdAndFinancialYear(userId, financialYear)
                .map(d -> ResponseEntity.ok(ApiResponse.success("Found", d)))
                .orElse(ResponseEntity.ok(ApiResponse.success("Not found", null)));
    }

    @PostMapping
    public ResponseEntity<ItDeclaration> saveOrUpdateItDeclaration(@RequestBody ItDeclaration itDeclaration) {
        return ResponseEntity.ok(itDeclarationService.saveOrUpdate(itDeclaration));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ItDeclaration>> updateStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> payload,
            @RequestHeader(value = "X-User-Id", required = false) String reviewerUserId) {
        String status = payload.get("status");
        String reason = payload.get("rejectionReason");
        if (status == null || status.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Status is required", null));
        }
        return itDeclarationService.updateStatus(id, status, reason, reviewerUserId)
                .map(d -> ResponseEntity.ok(ApiResponse.success("Status updated", d)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/bulk-approve")
    public ResponseEntity<List<ItDeclaration>> bulkApprove(@RequestBody List<String> ids) {
        return ResponseEntity.ok(itDeclarationService.bulkApprove(ids));
    }

    @PostMapping("/bulk-reject")
    public ResponseEntity<List<ItDeclaration>> bulkReject(@RequestBody List<String> ids) {
        return ResponseEntity.ok(itDeclarationService.bulkReject(ids));
    }
}
