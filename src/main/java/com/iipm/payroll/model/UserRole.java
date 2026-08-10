package com.iipm.payroll.model;

public enum UserRole {
    SUPER_ADMIN("Super Admin", "Super Administrator - Full Access"),
    FA_ADMIN("F&A Admin", "Finance & Account Admin - Verify and Approve"),
    FA_OPERATOR("F&A Operator", "Finance & Account Operator - Process Salary"),
    ADMIN_ADMIN("Administration Admin", "Admin Admin - Verify and Assign Structure"),
    ADMIN_OPERATOR("Administration Operator", "Admin Operator - Add Employee"),
    EMPLOYEE("Employee", "Employee - Self Service");

    private final String displayName;
    private final String description;

    UserRole(String displayName, String description) {
        this.displayName = displayName;
        this.description = description;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }
}
