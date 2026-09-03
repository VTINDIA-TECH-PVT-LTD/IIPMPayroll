package com.iipm.payroll.controller;

import com.iipm.payroll.dto.ApiResponse;
import com.iipm.payroll.dto.UserDTO;
import com.iipm.payroll.model.User;
import com.iipm.payroll.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*", maxAge = 3600)
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping
    public ResponseEntity<ApiResponse<UserDTO>> createUser(@Valid @RequestBody UserDTO userDTO, @RequestHeader("X-User-Id") String createdBy) {
        try {
            User user = userService.createUser(userDTO, createdBy);
            UserDTO response = convertToDTO(user);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("User created successfully", response));
        } catch (Exception e) {
            log.error("Error creating user", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error creating user: " + e.getMessage(), null));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDTO>> getUserById(@PathVariable String id) {
        try {
            User user = userService.getUserById(id);
            return ResponseEntity.ok(ApiResponse.success("User retrieved", convertToDTO(user)));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("User not found", null));
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserDTO>>> getAllUsers(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        try {
            List<User> users = userService.getAllUsers();
            
            boolean isSuperAdmin = false;
            if (userId != null) {
                try {
                    User caller = userService.getUserById(userId);
                    if (caller != null && com.iipm.payroll.model.UserRole.SUPER_ADMIN.equals(caller.getRole())) {
                        isSuperAdmin = true;
                    }
                } catch (Exception ignore) {
                    // Ignore error if user is not found
                }
            }
            
            if (!isSuperAdmin) {
                users = users.stream()
                        .filter(u -> com.iipm.payroll.model.UserRole.EMPLOYEE.equals(u.getRole()))
                        .toList();
            }

            List<UserDTO> userDTOs = users.stream().map(this::convertToDTO).toList();
            return ResponseEntity.ok(ApiResponse.success("Users retrieved", userDTOs));
        } catch (Exception e) {
            log.error("Error retrieving users", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error retrieving users", null));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDTO>> updateUser(@PathVariable String id, @Valid @RequestBody UserDTO userDTO,
                                                          @RequestHeader("X-User-Id") String updatedBy) {
        try {
            User user = userService.updateUser(id, userDTO, updatedBy);
            return ResponseEntity.ok(ApiResponse.success("User updated successfully", convertToDTO(user)));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error updating user: " + e.getMessage(), null));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteUser(@PathVariable String id) {
        try {
            userService.deleteUser(id);
            return ResponseEntity.ok(ApiResponse.success("User deactivated successfully", ""));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error deleting user", null));
        }
    }

    @PostMapping("/bulk")
    public ResponseEntity<ApiResponse<List<UserDTO>>> createBulkUsers(@Valid @RequestBody List<UserDTO> userDTOs, @RequestHeader("X-User-Id") String createdBy) {
        try {
            List<User> users = userService.createBulkUsers(userDTOs, createdBy);
            List<UserDTO> response = users.stream().map(this::convertToDTO).toList();
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Users created successfully", response));
        } catch (Exception e) {
            log.error("Error creating users in bulk", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error creating users: " + e.getMessage(), null));
        }
    }

    @DeleteMapping("/bulk")
    public ResponseEntity<ApiResponse<String>> deleteBulkUsers(@RequestBody List<String> ids) {
        try {
            userService.deleteBulkUsers(ids);
            return ResponseEntity.ok(ApiResponse.success("Users deactivated successfully", ""));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error deleting users", null));
        }
    }

    @GetMapping("/username/{username}")
    public ResponseEntity<ApiResponse<UserDTO>> getUserByUsername(@PathVariable String username) {
        try {
            User user = userService.getUserByUsername(username);
            return ResponseEntity.ok(ApiResponse.success("User retrieved", convertToDTO(user)));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("User not found", null));
        }
    }

    @PostMapping("/{id}/change-password")
    public ResponseEntity<ApiResponse<String>> changePassword(@PathVariable String id,
                                                             @RequestBody Map<String, String> passwordMap) {
        try {
            String oldPassword = passwordMap.get("oldPassword");
            String newPassword = passwordMap.get("newPassword");
            userService.changePassword(id, oldPassword, newPassword);
            return ResponseEntity.ok(ApiResponse.success("Password changed successfully", ""));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Error changing password: " + e.getMessage(), null));
        }
    }

    private UserDTO convertToDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .employeeId(user.getEmployeeId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .designation(user.getDesignation())
                .department(user.getDepartment())
                .payLevel(user.getPayLevel())
                .payIndex(user.getPayIndex())
                .basicPay(user.getBasicPay())
                .employeeType(user.getEmployeeType())
                .function(user.getFunction())
                .location(user.getLocation())
                .taxRegime(user.getTaxRegime())
                .pfAccountNumber(user.getPfAccountNumber())
                .pranAccountNumber(user.getPranAccountNumber())
                .bankAccountNumber(user.getBankAccountNumber())
                .ifscCode(user.getIfscCode())
                .bankName(user.getBankName())
                .pan(user.getPan())
                .aadhar(user.getAadhar())
                .deanAllowance(user.getDeanAllowance())
                .specialAllowance(user.getSpecialAllowance())
                .otherDeductions(user.getOtherDeductions())
                .taOverride(user.getTaOverride())
                .cghsOverride(user.getCghsOverride())
                .tds(user.getTds())
                .role(user.getRole().toString())
                .isActive(user.getIsActive() != null && user.getIsActive())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }
}
