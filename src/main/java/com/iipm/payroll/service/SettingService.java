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
        if (settingOpt.isEmpty()) {
            throw new RuntimeException("Setting not found: " + key);
        }

        Setting setting = settingOpt.get();
        setting.setValue(newValue);
        setting.setUpdatedAt(LocalDateTime.now());
        setting.setUpdatedBy(updatedBy);

        Setting updated = settingRepository.save(setting);
        log.info("Setting updated: {} = {}", key, newValue);
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
                Map.entry("MAX_80C_DEDUCTION", "150000")
        );

        for (Map.Entry<String, String> entry : defaults.entrySet()) {
            Optional<Setting> existing = settingRepository.findByKey(entry.getKey());
            if (existing.isEmpty()) {
                createSetting(entry.getKey(), entry.getValue(), "DOUBLE", "PAYROLL", "Default setting for " + entry.getKey());
            } else if (entry.getKey().equals("NPS_EMPLOYER_PERCENTAGE") && 
                      ("10".equals(existing.get().getValue()) || "10.0".equals(existing.get().getValue()))) {
                Setting setting = existing.get();
                setting.setValue("14");
                settingRepository.save(setting);
                log.info("Migrated NPS_EMPLOYER_PERCENTAGE from 10 to 14");
            }
        }

        log.info("Default settings initialized");
    }
}
