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
        try {
            User user = userService.getUserById(d.getUserId());
            item.put("employeeName", user.getFirstName() + " " + (user.getLastName() != null ? user.getLastName() : ""));
            item.put("employeeId", user.getEmployeeId());
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
    public ResponseEntity<ItDeclaration> getItDeclarationByYear(@PathVariable String userId, @PathVariable String financialYear) {
        return itDeclarationService.getByUserIdAndFinancialYear(userId, financialYear)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ItDeclaration> saveOrUpdateItDeclaration(@RequestBody ItDeclaration itDeclaration) {
        return ResponseEntity.ok(itDeclarationService.saveOrUpdate(itDeclaration));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ItDeclaration> updateStatus(@PathVariable String id, @RequestBody Map<String, String> payload) {
        String status = payload.get("status");
        if (status == null || status.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return itDeclarationService.updateStatus(id, status)
                .map(ResponseEntity::ok)
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
