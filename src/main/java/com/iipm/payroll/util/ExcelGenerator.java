package com.iipm.payroll.util;

import com.iipm.payroll.model.Payroll;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Component
public class ExcelGenerator {

    public byte[] generateApprovalSheetExcel(List<Payroll> payrolls, int month, int year) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Approval Sheet");
            
            // Styles
            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(HorizontalAlignment.CENTER);
            
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setWrapText(true);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);

            // Row 0: Title
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("INDIAN INSTITUTE OF PETROLEUM AND ENERGY - Salary Statement for " + month + "/" + year);
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, 16));

            // Row 1: Headers
            Row headerRow = sheet.createRow(1);
            String[] headers = {
                    "Sl.no", "Emp ID", "Pay level", "Basic", "DA", "TA", "HRA 20 %", 
                    "Dean / Warden Allowance", "NPS Employer share", "Gross \nSalary",
                    "PT", "TDS", "NPS Employee share", "NPS Employer share", "CGHS Contribution",
                    "Other deductions", "Total Deductions", "Net Salary"
            };

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 4000);
            }

            // Data rows
            int rowIdx = 2;
            int slNo = 1;
            for (Payroll p : payrolls) {
                Row row = sheet.createRow(rowIdx++);
                int col = 0;
                
                // Sl.no
                row.createCell(col++).setCellValue(slNo++);
                // Emp ID
                row.createCell(col++).setCellValue(p.getEmployeeId());
                // Pay level
                row.createCell(col++).setCellValue(""); // Need pay level from user, or just leave blank
                // Basic
                row.createCell(col++).setCellValue(p.getBasicPay());
                // DA
                row.createCell(col++).setCellValue(p.getDa());
                // TA
                row.createCell(col++).setCellValue(p.getTa());
                // HRA
                row.createCell(col++).setCellValue(p.getHra());
                // Dean/Warden Allowance
                row.createCell(col++).setCellValue(0); // Not mapped in model yet, default 0
                // NPS Employer Earning
                row.createCell(col++).setCellValue(p.getNpsEmployerShare());
                // Gross
                row.createCell(col++).setCellValue(p.getGrossSalary());
                // PT
                row.createCell(col++).setCellValue(p.getProfessionalTax());
                // TDS
                row.createCell(col++).setCellValue(p.getTds());
                // NPS Employee
                row.createCell(col++).setCellValue(p.getNpsEmployeeShare());
                // NPS Employer Deduction
                row.createCell(col++).setCellValue(p.getNpsEmployerShare());
                // CGHS
                row.createCell(col++).setCellValue(p.getCghs());
                // Other Deductions
                row.createCell(col++).setCellValue(p.getOtherDeductions());
                // Total Deductions
                row.createCell(col++).setCellValue(p.getTotalDeductions());
                // Net Salary
                row.createCell(col++).setCellValue(p.getNetSalary());

                // Apply style
                for(int i=0; i<col; i++) {
                    row.getCell(i).setCellStyle(dataStyle);
                }
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }
}
