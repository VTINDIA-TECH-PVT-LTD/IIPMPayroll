package com.iipm.payroll.util;

import com.itextpdf.text.*;
import com.itextpdf.text.pdf.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.DecimalFormat;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class PdfGenerator {

    private byte[] cachedLogoBytes = null;

    private synchronized byte[] loadLogoBytes() {
        if (cachedLogoBytes != null) return cachedLogoBytes;
        try {
            ClassPathResource res = new ClassPathResource("logo.png");
            if (res.exists()) {
                cachedLogoBytes = StreamUtils.copyToByteArray(res.getInputStream());
            }
        } catch (Exception e) {
            log.warn("Could not load logo.png from classpath: {}", e.getMessage());
        }
        return cachedLogoBytes;
    }

    public byte[] generatePayslipPDF(Map<String, Object> payslipData) throws DocumentException, IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        // Margins: Left: 1.5cm (42.52f), Right: 1.0cm (28.35f), Top: 1.5cm (42.52f), Bottom: 1.5cm (42.52f)
        Document document = new Document(PageSize.A4, 42.52f, 28.35f, 42.52f, 42.52f);
        PdfWriter writer = PdfWriter.getInstance(document, baos);

        byte[] logoBytes = loadLogoBytes();
        if (logoBytes != null) {
            writer.setPageEvent(new WatermarkPageEvent(logoBytes));
        }

        document.open();
        renderSinglePayslip(document, payslipData, logoBytes);
        document.close();
        return baos.toByteArray();
    }

    public byte[] generateCombinedPayslipsPDF(List<Map<String, Object>> payslipsList) throws DocumentException, IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        // Margins: Left: 1.5cm (42.52f), Right: 1.0cm (28.35f), Top: 1.5cm (42.52f), Bottom: 1.5cm (42.52f)
        Document document = new Document(PageSize.A4, 42.52f, 28.35f, 42.52f, 42.52f);
        PdfWriter writer = PdfWriter.getInstance(document, baos);

        byte[] logoBytes = loadLogoBytes();
        if (logoBytes != null) {
            writer.setPageEvent(new WatermarkPageEvent(logoBytes));
        }

        document.open();
        for (int i = 0; i < payslipsList.size(); i++) {
            if (i > 0) {
                document.newPage();
            }
            renderSinglePayslip(document, payslipsList.get(i), logoBytes);
        }
        document.close();
        return baos.toByteArray();
    }

    private void renderSinglePayslip(Document document, Map<String, Object> payslipData, byte[] logoBytes) throws DocumentException {
        BaseColor primaryBlue = new BaseColor(10, 49, 97);
        BaseColor darkText = new BaseColor(15, 23, 42);
        BaseColor grayText = new BaseColor(71, 85, 105);

        Font largeBold = new Font(Font.FontFamily.HELVETICA, 13f, Font.BOLD, primaryBlue);
        Font boldFont = new Font(Font.FontFamily.HELVETICA, 10.5f, Font.BOLD, darkText);
        Font normalFont = new Font(Font.FontFamily.HELVETICA, 9.5f, Font.NORMAL, darkText);
        Font smallFont = new Font(Font.FontFamily.HELVETICA, 8.5f, Font.NORMAL, grayText);
        Font paySlipFont = new Font(Font.FontFamily.HELVETICA, 12f, Font.BOLD, primaryBlue);

        // Header Table with Logo on left and Institute info centered
        PdfPTable headerTable = new PdfPTable(2);
        headerTable.setWidthPercentage(100);
        try {
            headerTable.setWidths(new float[]{1.3f, 8.7f});
        } catch (DocumentException ignored) {}

        PdfPCell logoCell = new PdfPCell();
        logoCell.setBorder(Rectangle.NO_BORDER);
        logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        logoCell.setHorizontalAlignment(Element.ALIGN_CENTER);

        if (logoBytes != null) {
            try {
                Image logo = Image.getInstance(logoBytes);
                logo.scaleToFit(65f, 65f);
                logo.setAlignment(Element.ALIGN_CENTER);
                logoCell.addElement(logo);
            } catch (Exception ignored) {}
        }

        PdfPCell textCell = new PdfPCell();
        textCell.setBorder(Rectangle.NO_BORDER);
        textCell.setVerticalAlignment(Element.ALIGN_MIDDLE);

        Paragraph title = new Paragraph("INDIAN INSTITUTE OF PETROLEUM AND ENERGY", largeBold);
        title.setAlignment(Element.ALIGN_CENTER);
        textCell.addElement(title);

        Paragraph subTitle = new Paragraph("(An Institute of National Importance)\nMinistry of Petroleum and Natural Gas, Government of India", boldFont);
        subTitle.setAlignment(Element.ALIGN_CENTER);
        textCell.addElement(subTitle);

        Paragraph address = new Paragraph("Vangali, Sabbavaram, Anakapalle – 531035, Andhra Pradesh, India\nE-Mail : dr.finance@iipe.ac.in | Website: www.iipe.ac.in", smallFont);
        address.setAlignment(Element.ALIGN_CENTER);
        textCell.addElement(address);

        headerTable.addCell(logoCell);
        headerTable.addCell(textCell);
        document.add(headerTable);

        document.add(new Paragraph(" "));

        String monthName = payslipData.get("monthName") != null ? payslipData.get("monthName").toString() : "";
        if (monthName.isEmpty() && payslipData.get("month") != null) {
            monthName = payslipData.get("month").toString();
        }
        String year = payslipData.get("year") != null ? payslipData.get("year").toString() : "";

        Paragraph paySlipTitle = new Paragraph("Pay Slip", paySlipFont);
        paySlipTitle.setAlignment(Element.ALIGN_CENTER);
        document.add(paySlipTitle);

        Paragraph paySlipPeriod = new Paragraph("for " + monthName + " " + year, normalFont);
        paySlipPeriod.setAlignment(Element.ALIGN_CENTER);
        document.add(paySlipPeriod);

        document.add(new Paragraph(" "));

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
        document.add(new Paragraph(" "));

        // Employee Info Table (4 Columns, No Borders)
        PdfPTable infoTable = new PdfPTable(4);
        infoTable.setWidthPercentage(100);
        try {
            infoTable.setWidths(new float[]{2.2f, 2.8f, 2.2f, 2.8f});
        } catch (DocumentException ignored) {}

        addInfoRow(infoTable, "Employee Number", payslipData.get("employeeId"), "Date of Joining", payslipData.get("dateOfJoining"), normalFont);
        addInfoRow(infoTable, "Designation", payslipData.get("designation"), "Date of Next Increment", payslipData.get("dateOfNextIncrement") != null ? payslipData.get("dateOfNextIncrement") : "01-Jul-" + year, normalFont);
        addInfoRow(infoTable, "Department", payslipData.get("department") != null ? payslipData.get("department") : "Finance & Accounts", "PAN Number", payslipData.get("pan"), normalFont);
        addInfoRow(infoTable, "Category", payslipData.get("category") != null ? payslipData.get("category") : "Regular - Non Teaching", "PRAN / EPF Number", payslipData.get("pran"), normalFont);
        addInfoRow(infoTable, "Pay Level", "Level-" + payslipData.get("payLevel"), "Tax Regime", payslipData.get("taxRegime") != null ? payslipData.get("taxRegime") : "New Tax Regime", normalFont);
        
        int pDays = payslipData.get("payableDays") != null ? ((Number) payslipData.get("payableDays")).intValue() : 30;
        int tDays = payslipData.get("totalDaysInMonth") != null ? ((Number) payslipData.get("totalDaysInMonth")).intValue() : 30;
        addInfoRow(infoTable, "Bank Details", payslipData.get("bankAccount"), "Pay Drawn (Days)", pDays + " / " + tDays + " Days", normalFont);

        document.add(infoTable);
        document.add(new Paragraph(" "));

        // Earnings and Deductions Table
        PdfPTable salaryTable = new PdfPTable(4);
        salaryTable.setWidthPercentage(100);
        try {
            salaryTable.setWidths(new float[]{3f, 2f, 3f, 2f});
        } catch (DocumentException ignored) {}

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
        document.add(new Paragraph(" "));

        if (ignorablePension > 0) {
            Font warnFont = new Font(Font.FontFamily.HELVETICA, 8, Font.ITALIC, BaseColor.DARK_GRAY);
            Paragraph warnPara = new Paragraph("* Note: Deductable Pension of Rs. " + df.format(ignorablePension) + " has been adjusted from Gross Salary as per 7th CPC re-employment rules.", warnFont);
            document.add(warnPara);
            document.add(new Paragraph(" "));
        }

        document.add(new Paragraph(" "));
        Paragraph footer = new Paragraph("This is a Computer Generated Pay Slip", smallFont);
        footer.setAlignment(Element.ALIGN_CENTER);
        document.add(footer);
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
        if (isHeader) {
            cell.setBackgroundColor(new BaseColor(241, 245, 249));
        }
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

        if (isBold) {
            BaseColor highlightBg = new BaseColor(248, 250, 252);
            c1.setBackgroundColor(highlightBg);
            c2.setBackgroundColor(highlightBg);
            c3.setBackgroundColor(highlightBg);
            c4.setBackgroundColor(highlightBg);
        }

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

    public byte[] generateApprovalSheetPDF(List<Map<String, Object>> payrolls, String month, int year) {
        return new byte[0];
    }

    private static class WatermarkPageEvent extends PdfPageEventHelper {
        private final byte[] logoBytes;

        public WatermarkPageEvent(byte[] logoBytes) {
            this.logoBytes = logoBytes;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            if (logoBytes == null) return;
            try {
                Image watermark = Image.getInstance(logoBytes);
                PdfContentByte under = writer.getDirectContentUnder();
                under.saveState();
                PdfGState gstate = new PdfGState();
                gstate.setFillOpacity(0.16f); // Subtle watermark
                under.setGState(gstate);

                float pageWidth = document.getPageSize().getWidth();
                float pageHeight = document.getPageSize().getHeight();
                float imgWidth = 280f;
                float imgHeight = 280f;
                float x = (pageWidth - imgWidth) / 2f;
                float y = (pageHeight - imgHeight) / 2f;

                watermark.scaleAbsolute(imgWidth, imgHeight);
                watermark.setAbsolutePosition(x, y);
                under.addImage(watermark);
                under.restoreState();
            } catch (Exception e) {
                log.error("Failed to render PDF watermark", e);
            }
        }
    }
}
