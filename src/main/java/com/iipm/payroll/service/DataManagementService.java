package com.iipm.payroll.service;

import com.iipm.payroll.model.User;
import com.iipm.payroll.model.UserRole;
import com.iipm.payroll.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;

@Slf4j
@Service
public class DataManagementService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public String importEmployeesFromExcel(MultipartFile file) throws IOException {
        int count = 0;
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            
            Sheet facultySheet = workbook.getSheet("Faculty ");
            if (facultySheet == null) facultySheet = workbook.getSheet("Faculty");
            if (facultySheet != null) {
                for (int i = 2; i <= facultySheet.getLastRowNum(); i++) {
                    Row row = facultySheet.getRow(i);
                    if (row == null) continue;
                    
                    Cell slNoCell = row.getCell(0);
                    if (slNoCell == null || slNoCell.getCellType() == CellType.BLANK) continue;
                    if (slNoCell.getCellType() == CellType.STRING && slNoCell.getStringCellValue().contains("Total")) break;
                    
                    String slNo = getCellValueAsString(slNoCell);
                    if (slNo.isEmpty() || slNo.equalsIgnoreCase("Total")) break;

                    String payLevel = getCellValueAsString(row.getCell(1));
                    Double basic = getCellValueAsDouble(row.getCell(2));
                    
                    if (basic == null || basic == 0) continue;

                    String firstName = "Faculty";
                    String lastName = slNo;
                    String username = "faculty_" + slNo;
                    String empId = "FAC" + String.format("%03d", (int)Double.parseDouble(slNo));
                    
                    createUserIfNotExists(username, empId, firstName, lastName, "FACULTY", "Faculty", payLevel, basic, UserRole.EMPLOYEE);
                    count++;
                }
            }
            
            Sheet nonTeachingSheet = workbook.getSheet("Non teaching Staff ");
            if (nonTeachingSheet == null) nonTeachingSheet = workbook.getSheet("Non teaching Staff");
            if (nonTeachingSheet != null) {
                int slNo = 1;
                for (int i = 3; i <= nonTeachingSheet.getLastRowNum(); i++) {
                    Row row = nonTeachingSheet.getRow(i);
                    if (row == null) continue;
                    
                    Cell designationCell = row.getCell(0);
                    if (designationCell == null || designationCell.getCellType() == CellType.BLANK) continue;
                    
                    String designation = getCellValueAsString(designationCell);
                    if (designation.isEmpty() || designation.contains("INDIAN INSTITUTE")) continue;

                    String payLevelStr = getCellValueAsString(row.getCell(1));
                    String payLevel = payLevelStr.replace("Level-", "");
                    Double basic = getCellValueAsDouble(row.getCell(2));
                    
                    if (basic == null || basic == 0) continue;

                    String firstName = "Staff";
                    String lastName = String.valueOf(slNo);
                    String username = "staff_" + slNo;
                    String empId = "NTS" + String.format("%03d", slNo);
                    
                    createUserIfNotExists(username, empId, firstName, lastName, "NON_TEACHING", designation, payLevel, basic, UserRole.EMPLOYEE);
                    count++;
                    slNo++;
                }
            }
        }
        return "Successfully imported " + count + " employees.";
    }

    private void createUserIfNotExists(String username, String empId, String firstName, String lastName, String dept, String designation, String payLevel, Double basicPay, UserRole role) {
        if (userRepository.existsByUsername(username)) return;
        
        User user = User.builder()
                .username(username)
                .password(passwordEncoder.encode("emp123"))
                .employeeId(empId)
                .firstName(firstName)
                .lastName(lastName)
                .email(username + "@iipm.gov.in")
                .department(dept)
                .designation(designation)
                .payLevel(payLevel)
                .basicPay(basicPay)
                .role(role)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .createdBy("system")
                .updatedBy("system")
                .build();
        userRepository.save(user);
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf(cell.getNumericCellValue());
            default -> "";
        };
    }

    private Double getCellValueAsDouble(Cell cell) {
        if (cell == null) return null;
        if (cell.getCellType() == CellType.NUMERIC) return cell.getNumericCellValue();
        if (cell.getCellType() == CellType.STRING) {
            try {
                return Double.parseDouble(cell.getStringCellValue().trim());
            } catch (Exception e) { return null; }
        }
        return null;
    }

    public byte[] exportSalaryRegister(int month, int year) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Salary Register " + month + "-" + year);
            
            Row headerRow = sheet.createRow(0);
            String[] columns = {"Sl.no", "Emp ID", "Name", "Basic", "DA", "TA", "HRA", "Gross", "NPS Employee", "NPS Employer", "PT", "CGHS", "Net Salary"};
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
            }

            Row row = sheet.createRow(1);
            row.createCell(0).setCellValue(1);
            row.createCell(1).setCellValue("EMP001");
            row.createCell(2).setCellValue("System Admin");
            row.createCell(3).setCellValue(123100.0);
            row.createCell(4).setCellValue(65243.0);
            row.createCell(5).setCellValue(0);
            row.createCell(6).setCellValue(0);
            row.createCell(7).setCellValue(188343.0);
            
            workbook.write(out);
            return out.toByteArray();
        }
    }
}
