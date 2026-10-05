package com.iipm.payroll.util;

import com.itextpdf.text.*;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.DecimalFormat;
import java.time.Month;
import java.util.Map;
import java.util.List;

@Slf4j
@Component
public class PdfGenerator {

    public byte[] generatePayslipPDF(Map<String, Object> payslipData) throws DocumentException, IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 40, 40, 40, 40);
        PdfWriter.getInstance(document, baos);

        document.open();

        Font boldFont = new Font(Font.FontFamily.HELVETICA, 12, Font.BOLD);
        Font normalFont = new Font(Font.FontFamily.HELVETICA, 10, Font.NORMAL);
        Font smallFont = new Font(Font.FontFamily.HELVETICA, 9, Font.NORMAL);
        Font largeBold = new Font(Font.FontFamily.HELVETICA, 14, Font.BOLD);

        // Header
        Paragraph title = new Paragraph("INDIAN INSTITUTE OF PETROLEUM AND ENERGY", largeBold);
        title.setAlignment(Element.ALIGN_CENTER);
        document.add(title);

        Paragraph subTitle = new Paragraph("(An Institute of National Importance)\nMinistry of Petroleum and Natural Gas, Government of India", boldFont);
        subTitle.setAlignment(Element.ALIGN_CENTER);
        document.add(subTitle);

        Paragraph address = new Paragraph("Vangali, Sabbavaram, Anakapalle – 531035, Andhra Pradesh, India\nE-Mail : dr.finance@iipe.ac.in | Website: www.iipe.ac.in", smallFont);
        address.setAlignment(Element.ALIGN_CENTER);
        document.add(address);

        document.add(new Paragraph("\n"));
        
        String monthName = payslipData.get("monthName") != null ? payslipData.get("monthName").toString() : "";
        String year = payslipData.get("year") != null ? payslipData.get("year").toString() : "";

        Paragraph paySlipTitle = new Paragraph("Pay Slip", boldFont);
        paySlipTitle.setAlignment(Element.ALIGN_CENTER);
        document.add(paySlipTitle);

        Paragraph paySlipPeriod = new Paragraph("for " + monthName + " " + year, normalFont);
        paySlipPeriod.setAlignment(Element.ALIGN_CENTER);
        document.add(paySlipPeriod);

        document.add(new Paragraph("\n"));

        String empName = payslipData.get("employeeName") != null ? payslipData.get("employeeName").toString().trim() : "";
        String category = payslipData.get("category") != null ? payslipData.get("category").toString() : "";
        String employeeId = payslipData.get("employeeId") != null ? payslipData.get("employeeId").toString() : "";
        String designation = payslipData.get("designation") != null ? payslipData.get("designation").toString().toUpperCase() : "";
        String dept = payslipData.get("department") != null ? payslipData.get("department").toString().toUpperCase() : "";
        
        boolean isAcademic = employeeId.toUpperCase().startsWith("TS") || 
                             (employeeId.toUpperCase().startsWith("CT") && !employeeId.toUpperCase().startsWith("CNT")) ||
                             category.toLowerCase().contains("teaching") || 
                             designation.contains("PROFESSOR") || 
                             designation.contains("FACULTY") ||
                             dept.contains("ENGINEERING") || 
                             dept.contains("SCIENCES") || 
                             dept.equals("FACULTY") || 
                             dept.equals("ACADEMIC");
        
        String cleanName = empName.replaceAll("(?i)^(dr\\.?|prof\\.?|mr\\.?|ms\\.?|mrs\\.?|shri\\.?|smt\\.?)\\s+", "").trim();
        String formattedEmpName = (isAcademic ? "Dr. " : "Mr. ") + cleanName;

        Paragraph nameHeader = new Paragraph(formattedEmpName, boldFont);
        nameHeader.setAlignment(Element.ALIGN_CENTER);
        document.add(nameHeader);
        document.add(new Paragraph("\n"));

        // Employee Info Table (No Borders)
        PdfPTable infoTable = new PdfPTable(4);
        infoTable.setWidthPercentage(100);
        try {
            infoTable.setWidths(new float[]{2.2f, 2.8f, 2.2f, 2.8f});
        } catch (DocumentException e) {}

        addInfoRow(infoTable, "Employee Number", payslipData.get("employeeId"), "Date of Joining", payslipData.get("dateOfJoining"), normalFont);
        addInfoRow(infoTable, "Designation", payslipData.get("designation"), "Date of Next Increment", payslipData.get("dateOfNextIncrement") != null ? payslipData.get("dateOfNextIncrement") : "01-Jul-" + year, normalFont);
        addInfoRow(infoTable, "Department", payslipData.get("department") != null ? payslipData.get("department") : "Finance & Accounts", "PAN Number", payslipData.get("pan"), normalFont);
        addInfoRow(infoTable, "Category", payslipData.get("category") != null ? payslipData.get("category") : "Regular - Non Teaching", "PRAN / EPF Number", payslipData.get("pran"), normalFont);
        addInfoRow(infoTable, "Pay Level", "Level-" + payslipData.get("payLevel"), "Tax Regime", payslipData.get("taxRegime") != null ? payslipData.get("taxRegime") : "New Tax Regime", normalFont);
        
        int pDays = payslipData.get("payableDays") != null ? ((Number) payslipData.get("payableDays")).intValue() : 30;
        int tDays = payslipData.get("totalDaysInMonth") != null ? ((Number) payslipData.get("totalDaysInMonth")).intValue() : 30;
        addInfoRow(infoTable, "Bank Details", payslipData.get("bankAccount"), "Pay Drawn (Days)", pDays + " / " + tDays + " Days", normalFont);

        document.add(infoTable);
        document.add(new Paragraph("\n"));

        // Earnings and Deductions Table
        PdfPTable salaryTable = new PdfPTable(4);
        salaryTable.setWidthPercentage(100);
        try {
            salaryTable.setWidths(new float[]{3f, 2f, 3f, 2f});
        } catch (DocumentException e) {}

        addSalaryCell(salaryTable, "Earnings", true);
        addSalaryCell(salaryTable, "Amount", true);
        addSalaryCell(salaryTable, "Deductions", true);
        addSalaryCell(salaryTable, "Amount", true);

        double basic = getDouble(payslipData, "basicPay");
        double da = getDouble(payslipData, "da");
        double hra = getDouble(payslipData, "hra");
        double npsEmpShare = getDouble(payslipData, "npsEmployerShare");
        double ta = getDouble(payslipData, "ta");
        double daArrears = getDouble(payslipData, "daArrears");
        double promotionArrears = getDouble(payslipData, "promotionArrears");
        double arrears = getDouble(payslipData, "arrears");
        double otherAllowances = getDouble(payslipData, "otherAllowances");
        double ignorablePension = getDouble(payslipData, "ignorablePension");
        
        double totalEarnings = Math.max(0.0, (basic + da + hra + npsEmpShare + ta + daArrears + promotionArrears + arrears + otherAllowances) - ignorablePension);

        double cghs = getDouble(payslipData, "cghs");
        double npsEmployee = getDouble(payslipData, "npsEmployeeShare");
        double npsEmployer = npsEmpShare;
        double pt = getDouble(payslipData, "professionalTax");
        double tds = getDouble(payslipData, "tds");
        double otherDeductions = getDouble(payslipData, "otherDeductions");
        
        double totalDeductions = cghs + npsEmployee + npsEmployer + pt + tds + otherDeductions;
        double netSalary = Math.max(0.0, totalEarnings - totalDeductions);

        DecimalFormat df = new DecimalFormat("#,##0.00");

        addSalaryRow(salaryTable, "Basic Pay", df.format(basic), "CGHS", df.format(cghs), false);
        addSalaryRow(salaryTable, "Dearness Allowance", df.format(da), "NPS Employee Share", df.format(npsEmployee), false);
        addSalaryRow(salaryTable, "HRA", df.format(hra), "NPS Employer Share D", df.format(npsEmployer), false);
        addSalaryRow(salaryTable, "NPS Employer Share E", df.format(npsEmpShare), "Professional Tax", df.format(pt), false);
        addSalaryRow(salaryTable, "Transport Allowance", df.format(ta), "Income Tax (TDS)", df.format(tds), false);
        
        if (daArrears > 0) {
            addSalaryRow(salaryTable, "DA&TA Arrears", df.format(daArrears), "", "", false);
        }
        if (promotionArrears > 0) {
            addSalaryRow(salaryTable, "Promotional Arrears", df.format(promotionArrears), "", "", false);
        }
        if (arrears > 0) {
            addSalaryRow(salaryTable, "Arrears", df.format(arrears), "", "", false);
        }
        if (otherAllowances > 0) {
            addSalaryRow(salaryTable, "Special / Dean Allowance", df.format(otherAllowances), "", "", false);
        }
        if (ignorablePension > 0) {
            addSalaryRow(salaryTable, "Deductable Pension (Deducted)", "- " + df.format(ignorablePension), "", "", false);
        }
        if (otherDeductions > 0) {
            addSalaryRow(salaryTable, "", "", "Other Deductions", df.format(otherDeductions), false);
        }

        addSalaryRow(salaryTable, "Total Earnings (Gross)", df.format(totalEarnings), "Total Deductions", df.format(totalDeductions), true);
        
        addSalaryRow(salaryTable, "", "", "Net Amount", "Rs " + df.format(netSalary), true);

        document.add(salaryTable);
        document.add(new Paragraph("\n"));

        if (ignorablePension > 0) {
            Font warnFont = new Font(Font.FontFamily.HELVETICA, 8, Font.ITALIC, BaseColor.DARK_GRAY);
            Paragraph warnPara = new Paragraph("* Note: Deductable Pension of Rs. " + df.format(ignorablePension) + " has been adjusted from Gross Salary as per 7th CPC re-employment rules.", warnFont);
            document.add(warnPara);
            document.add(new Paragraph("\n"));
        }

        document.add(new Paragraph("\n"));
        Paragraph footer = new Paragraph("This is a Computer Generated Pay Slip", smallFont);
        footer.setAlignment(Element.ALIGN_CENTER);
        document.add(footer);

        document.close();
        return baos.toByteArray();
    }

    private void addInfoRow(PdfPTable table, String col1, Object val1, String col2, Object val2, Font font) {
        table.addCell(createNoBorderCell(col1, font));
        table.addCell(createNoBorderCell(": " + (val1 != null ? val1.toString() : ""), font));
        table.addCell(createNoBorderCell(col2, font));
        table.addCell(createNoBorderCell(": " + (val2 != null ? val2.toString() : ""), font));
    }

    private PdfPCell createNoBorderCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPaddingBottom(5f);
        return cell;
    }

    private void addSalaryCell(PdfPTable table, String text, boolean isHeader) {
        Font font = new Font(Font.FontFamily.HELVETICA, 10, isHeader ? Font.BOLD : Font.NORMAL);
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(5f);
        if (text.equals("Amount") || text.startsWith("Rs ") || text.matches(".*\\d+.*")) {
            cell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        }
        table.addCell(cell);
    }

    private void addSalaryRow(PdfPTable table, String label1, String amt1, String label2, String amt2, boolean isBold) {
        Font font = new Font(Font.FontFamily.HELVETICA, 10, isBold ? Font.BOLD : Font.NORMAL);
        
        PdfPCell c1 = new PdfPCell(new Phrase(label1, font)); c1.setPadding(5f);
        PdfPCell c2 = new PdfPCell(new Phrase(amt1, font)); c2.setPadding(5f); c2.setHorizontalAlignment(Element.ALIGN_RIGHT);
        PdfPCell c3 = new PdfPCell(new Phrase(label2, font)); c3.setPadding(5f);
        PdfPCell c4 = new PdfPCell(new Phrase(amt2, font)); c4.setPadding(5f); c4.setHorizontalAlignment(Element.ALIGN_RIGHT);

        table.addCell(c1); table.addCell(c2); table.addCell(c3); table.addCell(c4);
    }

    @SuppressWarnings("unchecked")
    private double getDouble(Map<String, Object> map, String key) {
        if (map == null) return 0.0;
        if (map.containsKey(key) && map.get(key) != null) {
            return ((Number) map.get(key)).doubleValue();
        }
        if (map.containsKey("earnings") && map.get("earnings") instanceof Map) {
            Map<String, Object> earn = (Map<String, Object>) map.get("earnings");
            if (earn.containsKey(key) && earn.get(key) != null) {
                return ((Number) earn.get(key)).doubleValue();
            }
        }
        if (map.containsKey("deductions") && map.get("deductions") instanceof Map) {
            Map<String, Object> ded = (Map<String, Object>) map.get("deductions");
            if (ded.containsKey(key) && ded.get(key) != null) {
                return ((Number) ded.get(key)).doubleValue();
            }
            if (key.equals("npsEmployeeShare") && ded.containsKey("npsEmployee") && ded.get("npsEmployee") != null) {
                return ((Number) ded.get("npsEmployee")).doubleValue();
            }
        }
        return 0.0;
    }

    // Deprecated / Unused based on new layout, returning empty for safety if called elsewhere
    public byte[] generateApprovalSheetPDF(List<Map<String, Object>> payrolls, String month, int year) {
        return new byte[0];
    }
    
    // Very basic number to words converter for English
    private String numberToWords(int n) {
        if (n == 0) return "Zero";
        String[] units = { "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen" };
        String[] tens = { "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety" };
        
        if (n < 20) return units[n];
        if (n < 100) return tens[n / 10] + ((n % 10 != 0) ? " " : "") + units[n % 10];
        if (n < 1000) return units[n / 100] + " Hundred" + ((n % 100 != 0) ? " and " : "") + numberToWords(n % 100);
        if (n < 100000) return numberToWords(n / 1000) + " Thousand" + ((n % 1000 != 0) ? " " : "") + numberToWords(n % 1000);
        if (n < 10000000) return numberToWords(n / 100000) + " Lakh" + ((n % 100000 != 0) ? " " : "") + numberToWords(n % 100000);
        return numberToWords(n / 10000000) + " Crore" + ((n % 10000000 != 0) ? " " : "") + numberToWords(n % 10000000);
    }
}
