package com.iipm.payroll.controller;

import com.iipm.payroll.dto.ApiResponse;
import com.iipm.payroll.service.ReportService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ReportController {

    @Autowired
    private ReportService reportService;

    @GetMapping("/salary-register/{month}/{year}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSalaryRegister(@PathVariable int month,
                                                                             @PathVariable int year) {
        try {
            Map<String, Object> report = reportService.getSalaryRegister(month, year);
            return ResponseEntity.ok(ApiResponse.success("Salary Register retrieved for " + month + "/" + year, report));
        } catch (Exception e) {
            log.error("Error generating salary register", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error generating report: " + e.getMessage(), null));
        }
    }

    @GetMapping("/salary-register/{month}/{year}/export")
    public ResponseEntity<byte[]> exportSalaryRegister(@PathVariable int month, @PathVariable int year) {
        try {
            byte[] data = reportService.exportSalaryRegister(month, year);
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=salary_register_" + month + "_" + year + ".xlsx")
                    .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .body(data);
        } catch (Exception e) {
            log.error("Error exporting salary register", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/nps/{year}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getNPSReport(@PathVariable int year) {
        try {
            Map<String, Object> report = reportService.getNPSReport(year);
            return ResponseEntity.ok(ApiResponse.success("NPS Report retrieved for year " + year, report));
        } catch (Exception e) {
            log.error("Error generating NPS report", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error generating report", null));
        }
    }

    @GetMapping("/tds/{year}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTDSReport(@PathVariable int year) {
        try {
            Map<String, Object> report = reportService.getTDSReport(year);
            return ResponseEntity.ok(ApiResponse.success("TDS Report retrieved for year " + year, report));
        } catch (Exception e) {
            log.error("Error generating TDS report", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error generating report", null));
        }
    }

    @GetMapping("/ytd/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getYTDReport(@PathVariable String userId) {
        try {
            Map<String, Object> report = reportService.getYTDReport(userId);
            return ResponseEntity.ok(ApiResponse.success("YTD Report retrieved", report));
        } catch (Exception e) {
            log.error("Error generating YTD report", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error generating report", null));
        }
    }

    @GetMapping("/comparison/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSalaryComparison(@PathVariable String userId) {
        try {
            Map<String, Object> report = reportService.getSalaryComparison(userId);
            return ResponseEntity.ok(ApiResponse.success("Salary Comparison retrieved", report));
        } catch (Exception e) {
            log.error("Error generating comparison report", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error generating report", null));
        }
    }

    @GetMapping("/trend/{userId}/{year}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMonthlyTrend(@PathVariable String userId,
                                                                           @PathVariable int year) {
        try {
            Map<String, Object> report = reportService.getMonthlyTrendReport(userId, year);
            return ResponseEntity.ok(ApiResponse.success("Monthly Trend retrieved for year " + year, report));
        } catch (Exception e) {
            log.error("Error generating monthly trend report", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error generating report", null));
        }
    }

    @GetMapping("/department/{month}/{year}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDepartmentWiseReport(@PathVariable int month,
                                                                                   @PathVariable int year) {
        try {
            Map<String, Object> report = reportService.getDepartmentWiseReport(month, year);
            return ResponseEntity.ok(ApiResponse.success("Department Wise Report retrieved", report));
        } catch (Exception e) {
            log.error("Error generating department wise report", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error generating report", null));
        }
    }

    @GetMapping("/statistics/{year}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPayrollStatistics(@PathVariable int year) {
        try {
            Map<String, Object> report = reportService.getPayrollStatistics(year);
            return ResponseEntity.ok(ApiResponse.success("Payroll Statistics retrieved for year " + year, report));
        } catch (Exception e) {
            log.error("Error generating payroll statistics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error generating report", null));
        }
    }
}
