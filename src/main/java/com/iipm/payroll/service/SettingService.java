package com.iipm.payroll.service;

import com.iipm.payroll.model.Setting;
import com.iipm.payroll.repository.SettingRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import jakarta.annotation.PostConstruct;

@Slf4j
@Service
public class SettingService {

    @Autowired
    private SettingRepository settingRepository;

    public Setting createSetting(String key, String value, String dataType, String category, String description) {
        Setting setting = Setting.builder()
                .key(key)
                .value(value)
                .dataType(dataType)
                .category(category)
                .description(description)
                .isActive(true)
                .effectiveFrom(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Setting saved = settingRepository.save(setting);
        log.info("Setting created: {} = {}", key, value);
        return saved;
    }

    public Setting updateSetting(String key, String newValue, String updatedBy) {
        Optional<Setting> settingOpt = settingRepository.findByKey(key);
        Setting setting;
        if (settingOpt.isEmpty()) {
            String cat = key.startsWith("FORM16_") ? "FORM16" : "PAYROLL";
            setting = Setting.builder()
                    .key(key)
                    .value(newValue)
                    .dataType("STRING")
                    .category(cat)
                    .description("Setting for " + key)
                    .isActive(true)
                    .effectiveFrom(LocalDateTime.now())
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .updatedBy(updatedBy != null ? updatedBy : "SYSTEM")
                    .build();
        } else {
            setting = settingOpt.get();
            setting.setValue(newValue);
            setting.setUpdatedAt(LocalDateTime.now());
            setting.setUpdatedBy(updatedBy != null ? updatedBy : "SYSTEM");
        }

        Setting updated = settingRepository.save(setting);
        log.info("Setting updated/saved: {} = {}", key, newValue);
        return updated;
    }

    public Setting getSettingByKey(String key) {
        return settingRepository.findByKeyAndIsActiveTrue(key)
                .orElseThrow(() -> new RuntimeException("Setting not found: " + key));
    }

    public String getSettingValueByKey(String key) {
        Optional<Setting> setting = settingRepository.findByKeyAndIsActiveTrue(key);
        return setting.map(Setting::getValue).orElse(null);
    }

    public Double getSettingAsDouble(String key) {
        String value = getSettingValueByKey(key);
        if (value == null) return null;
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException e) {
            log.error("Cannot convert setting {} to double: {}", key, value);
            return null;
        }
    }

    public Integer getSettingAsInteger(String key) {
        String value = getSettingValueByKey(key);
        if (value == null) return null;
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            log.error("Cannot convert setting {} to integer: {}", key, value);
            return null;
        }
    }

    public Boolean getSettingAsBoolean(String key) {
        String value = getSettingValueByKey(key);
        if (value == null) return null;
        return Boolean.parseBoolean(value);
    }

    public List<Setting> getAllSettings() {
        return settingRepository.findByIsActiveTrueOrderByCategory();
    }

    public List<Setting> getSettingsByCategory(String category) {
        return settingRepository.findByCategoryAndIsActiveTrue(category);
    }

    public Map<String, Double> getAllPayrollSettings() {
        Map<String, Double> settings = new HashMap<>();

        settings.put("DA_PERCENTAGE", getSettingAsDouble("DA_PERCENTAGE") != null ? getSettingAsDouble("DA_PERCENTAGE") : 60.0);
        settings.put("HRA_PERCENTAGE", getSettingAsDouble("HRA_PERCENTAGE") != null ? getSettingAsDouble("HRA_PERCENTAGE") : 20.0);
        settings.put("NPS_EMPLOYEE_PERCENTAGE", getSettingAsDouble("NPS_EMPLOYEE_PERCENTAGE") != null ? getSettingAsDouble("NPS_EMPLOYEE_PERCENTAGE") : 10.0);
        settings.put("NPS_EMPLOYER_PERCENTAGE", getSettingAsDouble("NPS_EMPLOYER_PERCENTAGE") != null ? getSettingAsDouble("NPS_EMPLOYER_PERCENTAGE") : 14.0);
        settings.put("PT_AMOUNT", getSettingAsDouble("PT_AMOUNT") != null ? getSettingAsDouble("PT_AMOUNT") : 200.0);
        settings.put("CGHS_AMOUNT", getSettingAsDouble("CGHS_AMOUNT") != null ? getSettingAsDouble("CGHS_AMOUNT") : 1000.0);
        settings.put("TA_FIXED_AMOUNT", getSettingAsDouble("TA_FIXED_AMOUNT") != null ? getSettingAsDouble("TA_FIXED_AMOUNT") : 3600.0);
        settings.put("TA_DA_PERCENTAGE", getSettingAsDouble("TA_DA_PERCENTAGE") != null ? getSettingAsDouble("TA_DA_PERCENTAGE") : 60.0);

        log.debug("Loaded payroll settings: {}", settings);
        return settings;
    }

    public void deactivateSetting(String key) {
        Optional<Setting> settingOpt = settingRepository.findByKey(key);
        if (settingOpt.isPresent()) {
            Setting setting = settingOpt.get();
            setting.setActive(false);
            setting.setEffectiveTo(LocalDateTime.now());
            settingRepository.save(setting);
            log.info("Setting deactivated: {}", key);
        }
    }

    @PostConstruct
    public void initializeDefaultSettings() {
        Map<String, String> defaults = Map.ofEntries(
                Map.entry("DA_PERCENTAGE", "60"),
                Map.entry("HRA_PERCENTAGE", "20"),
                Map.entry("NPS_EMPLOYEE_PERCENTAGE", "10"),
                Map.entry("NPS_EMPLOYER_PERCENTAGE", "14"),
                Map.entry("PT_AMOUNT", "200"),
                Map.entry("CGHS_AMOUNT", "1000"),
                Map.entry("TA_FIXED_AMOUNT", "3600"),
                Map.entry("TA_DA_PERCENTAGE", "60"),
                Map.entry("DEFAULT_TAX_REGIME", "NEW"),
                Map.entry("STANDARD_DEDUCTION_NEW", "75000"),
                Map.entry("STANDARD_DEDUCTION_OLD", "50000"),
                Map.entry("MAX_80C_DEDUCTION", "150000"),
                Map.entry("FORM16_EMPLOYER_NAME", "INDIAN INSTITUTE OF PETROLEUM AND ENERGY"),
                Map.entry("FORM16_EMPLOYER_ADDRESS", "Vangali, Sabbavaram, Anakapalle \u2013 531035, Andhra Pradesh, India"),
                Map.entry("FORM16_EMPLOYER_PAN", "AABAI0046C"),
                Map.entry("FORM16_EMPLOYER_TAN", "VPNI00723C"),
                Map.entry("FORM16_EMPLOYER_EMAIL", "dr.finance@iipe.ac.in"),
                Map.entry("FORM16_CIT_TDS", "The Commissioner of Income Tax (TDS), Hyderabad - 500004"),
                Map.entry("FORM16_SIGNATORY_NAME", ""),
                Map.entry("FORM16_SIGNATORY_FATHER_NAME", ""),
                Map.entry("FORM16_SIGNATORY_DESIGNATION", ""),
                Map.entry("FORM16_PLACE", "Visakhapatnam"),
                Map.entry("FORM16_CERTIFICATE_NO", ""),
                Map.entry("FORM16_FORM_NO_2627", "FORM NO. 130"),
                Map.entry("FORM16_RULE_2627", "[See rule 31(1)(a)]"),
                Map.entry("FORM16_CERT_TEXT_2627", "Certificate under section of the Income-tax Act, 2025 for tax deducted at source on salary paid to an employee under section 192 or section 194P"),
                Map.entry("FORM16_TAX_YEAR_LABEL_2627", "Tax Year"),
                Map.entry("FORM16_FORM_NO_2526", "FORM NO. 16"),
                Map.entry("FORM16_RULE_2526", "[See rule 31(1)(a)]"),
                Map.entry("FORM16_CERT_TEXT_2526", "Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source on salary paid to an employee under section 192 or pension/interest income of specified senior citizen under section 194P"),
                Map.entry("FORM16_TAX_YEAR_LABEL_2526", "Assessment Year"),
                Map.entry("FORM16_Q1_RECEIPT", ""),
                Map.entry("FORM16_Q2_RECEIPT", ""),
                Map.entry("FORM16_Q3_RECEIPT", ""),
                Map.entry("FORM16_Q4_RECEIPT", ""),
                Map.entry("FORM16_Q1_BSR", ""),
                Map.entry("FORM16_Q2_BSR", ""),
                Map.entry("FORM16_Q3_BSR", ""),
                Map.entry("FORM16_Q4_BSR", ""),
                Map.entry("FORM16_Q1_CHALLAN_DATE", ""),
                Map.entry("FORM16_Q2_CHALLAN_DATE", ""),
                Map.entry("FORM16_Q3_CHALLAN_DATE", ""),
                Map.entry("FORM16_Q4_CHALLAN_DATE", ""),
                Map.entry("FORM16_Q1_CHALLAN_SERIAL", ""),
                Map.entry("FORM16_Q2_CHALLAN_SERIAL", ""),
                Map.entry("FORM16_Q3_CHALLAN_SERIAL", ""),
                Map.entry("FORM16_Q4_CHALLAN_SERIAL", "")
        );

        for (Map.Entry<String, String> entry : defaults.entrySet()) {
            Optional<Setting> existing = settingRepository.findByKey(entry.getKey());
            if (existing.isEmpty()) {
                String cat = entry.getKey().startsWith("FORM16_") ? "FORM16" : "PAYROLL";
                createSetting(entry.getKey(), entry.getValue(), "STRING", cat, "Default setting for " + entry.getKey());
            } else if (entry.getKey().equals("NPS_EMPLOYER_PERCENTAGE") && 
                      ("10".equals(existing.get().getValue()) || "10.0".equals(existing.get().getValue()))) {
                Setting setting = existing.get();
                setting.setValue("14");
                settingRepository.save(setting);
                log.info("Migrated NPS_EMPLOYER_PERCENTAGE from 10 to 14");
            } else if (entry.getKey().equals("FORM16_EMPLOYER_NAME") && existing.get().getValue().contains("&")) {
                Setting setting = existing.get();
                setting.setValue("INDIAN INSTITUTE OF PETROLEUM AND ENERGY");
                settingRepository.save(setting);
                log.info("Migrated FORM16_EMPLOYER_NAME to official AND name");
            } else if (entry.getKey().equals("FORM16_EMPLOYER_ADDRESS") && existing.get().getValue().contains("Tech-Horizon")) {
                Setting setting = existing.get();
                setting.setValue("Vangali, Sabbavaram, Anakapalle \u2013 531035, Andhra Pradesh, India");
                settingRepository.save(setting);
                log.info("Migrated FORM16_EMPLOYER_ADDRESS to official payslip address");
            } else if (entry.getKey().equals("FORM16_EMPLOYER_EMAIL") && "fo@iipe.ac.in".equals(existing.get().getValue())) {
                Setting setting = existing.get();
                setting.setValue("dr.finance@iipe.ac.in");
                settingRepository.save(setting);
                log.info("Migrated FORM16_EMPLOYER_EMAIL to dr.finance@iipe.ac.in");
            } else if (entry.getKey().equals("FORM16_SIGNATORY_NAME") && "Dr. Ram Phal Dwivedi".equals(existing.get().getValue())) {
                Setting setting = existing.get();
                setting.setValue("");
                settingRepository.save(setting);
            } else if (entry.getKey().equals("FORM16_SIGNATORY_DESIGNATION") && "Registrar / Authorised Signatory".equals(existing.get().getValue())) {
                Setting setting = existing.get();
                setting.setValue("");
                settingRepository.save(setting);
            }
        }

        log.info("Default settings initialized");
    }
}
