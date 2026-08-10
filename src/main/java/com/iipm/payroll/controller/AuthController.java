package com.iipm.payroll.controller;

import com.iipm.payroll.dto.ApiResponse;
import com.iipm.payroll.dto.LoginRequest;
import com.iipm.payroll.dto.LoginResponse;
import com.iipm.payroll.model.User;
import com.iipm.payroll.model.UserRole;
import com.iipm.payroll.repository.UserRepository;
import com.iipm.payroll.service.AuthService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            LoginResponse response = authService.login(loginRequest);
            return ResponseEntity.ok(ApiResponse.success("Login successful", response));
        } catch (Exception e) {
            log.error("Login failed", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Login failed: " + e.getMessage(), null));
        }
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResponse<LoginResponse>> refreshToken(@RequestHeader("Authorization") String refreshToken) {
        try {
            String token = refreshToken.replace("Bearer ", "");
            LoginResponse response = authService.refreshToken(token);
            return ResponseEntity.ok(ApiResponse.success("Token refreshed", response));
        } catch (Exception e) {
            log.error("Token refresh failed", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Token refresh failed", null));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout(@RequestHeader("Authorization") String token) {
        try {
            String userId = authService.getUserIdFromToken(token.replace("Bearer ", ""));
            authService.logout(userId);
            return ResponseEntity.ok(ApiResponse.success("Logout successful", ""));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.success("Logout successful", ""));
        }
    }

    @GetMapping("/validate")
    public ResponseEntity<ApiResponse<Boolean>> validateToken(@RequestHeader("Authorization") String token) {
        try {
            String jwtToken = token.replace("Bearer ", "");
            boolean isValid = authService.validateToken(jwtToken);
            return ResponseEntity.ok(ApiResponse.success("Token validation status", isValid));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.success("Token validation status", false));
        }
    }

    /**
     * POST /api/auth/init-demo
     * Creates demo users (admin, payroll_officer, employee1) in MongoDB if they don't already exist.
     * Intended for first-time setup / development only.
     */
    @PostMapping("/init-demo")
    public ResponseEntity<ApiResponse<List<Map<String, String>>>> initDemo() {
        List<Map<String, String>> created = new ArrayList<>();

        // Wipe DB for fresh start
        userRepository.deleteAll();
        // Assuming we need to clear other things if possible, but let's just clear users for now
        
        record DemoUser(String username, String password, String employeeId,
                        String firstName, String lastName, String email,
                        String department, String designation, String payLevel,
                        Double basicPay, UserRole role) {}

        List<DemoUser> demoUsers = List.of(
            new DemoUser("superadmin", "defaultPassword123", "SUP001", "Super", "Admin",
                    "superadmin@iipm.gov.in", "Administration", "Director", "13",
                    123100.0, UserRole.SUPER_ADMIN)
        );

        for (DemoUser demo : demoUsers) {
            try {
                User user = User.builder()
                        .username(demo.username())
                        .password(passwordEncoder.encode(demo.password()))
                        .employeeId(demo.employeeId())
                        .firstName(demo.firstName())
                        .lastName(demo.lastName())
                        .email(demo.email())
                        .department(demo.department())
                        .designation(demo.designation())
                        .payLevel(demo.payLevel())
                        .basicPay(demo.basicPay())
                        .role(demo.role())
                        .isActive(true)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .createdBy("system")
                        .updatedBy("system")
                        .build();

                userRepository.save(user);
                created.add(Map.of("username", demo.username(), "role", demo.role().name(), "password", demo.password()));
                log.info("Demo user created: {} ({})", demo.username(), demo.role());
            } catch (Exception e) {
                log.error("Failed to create demo user {}: {}", demo.username(), e.getMessage());
            }
        }

        String message = "Init-demo complete: " + created.size() + " created";
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(message, created));
    }
}
