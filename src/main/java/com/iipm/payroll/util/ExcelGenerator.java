package com.iipm.payroll.util;

import com.iipm.payroll.model.Payroll;
import com.iipm.payroll.model.User;
import com.iipm.payroll.repository.UserRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Component
public class ExcelGenerator {

    @Autowired
    private UserRepository userRepository;

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
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 20));

            // Row 1: Headers
            Row headerRow = sheet.createRow(1);
            String[] headers = {
                    "Sl.no", "Emp ID", "Employee Name", "Designation", "Pay Scale", "Basic", "DA", "TA", "HRA 20%", 
                    "Dean / Warden Allowance", "NPS Employer share", "Gross Salary",
                    "PT", "TDS", "NPS Employee share", "NPS Employer share", "CGHS Contribution",
                    "Other deductions", "Total Deductions", "Net Salary", "Remark"
            };

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, i == 2 ? 6000 : 4000); // make name column wider
            }

            // Data rows
            int rowIdx = 2;
            int slNo = 1;
            
            // Totals
            double[] totals = new double[15];

            for (Payroll p : payrolls) {
                User user = userRepository.findById(p.getUserId()).orElse(new User());

                Row row = sheet.createRow(rowIdx++);
                int col = 0;
                
                row.createCell(col++).setCellValue(slNo++);
                row.createCell(col++).setCellValue(p.getEmployeeId());
                row.createCell(col++).setCellValue((user.getFirstName() != null ? user.getFirstName() : "") + " " + (user.getLastName() != null ? user.getLastName() : ""));
                row.createCell(col++).setCellValue(user.getDesignation() != null ? user.getDesignation() : "");
                row.createCell(col++).setCellValue("Level-" + (user.getPayLevel() != null ? user.getPayLevel() : ""));
                
                row.createCell(col++).setCellValue(p.getBasicPay());
                totals[0] += p.getBasicPay();
                row.createCell(col++).setCellValue(p.getDa());
                totals[1] += p.getDa();
                row.createCell(col++).setCellValue(p.getTa());
                totals[2] += p.getTa();
                row.createCell(col++).setCellValue(p.getHra());
                totals[3] += p.getHra();
                row.createCell(col++).setCellValue(0); // Dean/Warden Allowance
                totals[4] += 0;
                row.createCell(col++).setCellValue(p.getNpsEmployerShare());
                totals[5] += p.getNpsEmployerShare();
                row.createCell(col++).setCellValue(p.getGrossSalary());
                totals[6] += p.getGrossSalary();
                row.createCell(col++).setCellValue(p.getProfessionalTax());
                totals[7] += p.getProfessionalTax();
                row.createCell(col++).setCellValue(p.getTds());
                totals[8] += p.getTds();
                row.createCell(col++).setCellValue(p.getNpsEmployeeShare());
                totals[9] += p.getNpsEmployeeShare();
                row.createCell(col++).setCellValue(p.getNpsEmployerShare());
                totals[10] += p.getNpsEmployerShare();
                row.createCell(col++).setCellValue(p.getCghs());
                totals[11] += p.getCghs();
                row.createCell(col++).setCellValue(p.getOtherDeductions());
                totals[12] += p.getOtherDeductions();
                row.createCell(col++).setCellValue(p.getTotalDeductions());
                totals[13] += p.getTotalDeductions();
                row.createCell(col++).setCellValue(p.getNetSalary());
                totals[14] += p.getNetSalary();
                
                row.createCell(col++).setCellValue(p.getRemark() != null ? p.getRemark() : "");

                // Apply style
                for(int i=0; i<col; i++) {
                    row.getCell(i).setCellStyle(dataStyle);
                }
            }

            // Totals Row
            Row totalsRow = sheet.createRow(rowIdx++);
            Cell totalLabel = totalsRow.createCell(4);
            totalLabel.setCellValue("Total");
            totalLabel.setCellStyle(headerStyle);
            
            for (int i = 0; i < totals.length; i++) {
                Cell cell = totalsRow.createCell(5 + i);
                cell.setCellValue(totals[i]);
                cell.setCellStyle(headerStyle);
            }
            totalsRow.createCell(20).setCellStyle(headerStyle);

            rowIdx += 3;
            // Signatures Row 1
            Row sigRow1 = sheet.createRow(rowIdx++);
            sigRow1.createCell(1).setCellValue("Prepared By");
            sigRow1.createCell(5).setCellValue("Checked By");
            sigRow1.createCell(9).setCellValue("Verified By");
            sigRow1.createCell(13).setCellValue("Approved By");

            rowIdx += 2;
            // Signatures Row 2
            Row sigRow2 = sheet.createRow(rowIdx++);
            sigRow2.createCell(1).setCellValue("F&A Operator");
            sigRow2.createCell(5).setCellValue("Officer (F&A)");
            sigRow2.createCell(9).setCellValue("Deputy Registrar");
            sigRow2.createCell(13).setCellValue("Registrar / Director");

            workbook.write(out);
            return out.toByteArray();
        }
    }
}
