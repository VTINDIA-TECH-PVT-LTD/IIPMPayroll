package com.iipm.payroll.service;

import com.iipm.payroll.dto.LoginRequest;
import com.iipm.payroll.dto.LoginResponse;
import com.iipm.payroll.model.User;
import com.iipm.payroll.repository.UserRepository;
import com.iipm.payroll.util.JwtUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Slf4j
@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private NotificationService notificationService;

    public LoginResponse login(LoginRequest loginRequest) {
        // Demo credentials - for testing without database
        if ("admin".equals(loginRequest.getUsername()) && "admin123".equals(loginRequest.getPassword())) {
            String token = jwtUtil.generateToken("admin", "admin-id-001", "ADMIN");
            String refreshToken = jwtUtil.generateRefreshToken("admin", "admin-id-001");
            return LoginResponse.builder()
                    .token(token)
                    .refreshToken(refreshToken)
                    .userId("admin-id-001")
                    .username("admin")
                    .role("ADMIN")
                    .expiresIn(86400000L)
                    .message("Login successful")
                    .build();
        }

        if ("employee1".equals(loginRequest.getUsername()) && "emp123".equals(loginRequest.getPassword())) {
            String token = jwtUtil.generateToken("employee1", "emp-id-001", "EMPLOYEE");
            String refreshToken = jwtUtil.generateRefreshToken("employee1", "emp-id-001");
            return LoginResponse.builder()
                    .token(token)
                    .refreshToken(refreshToken)
                    .userId("emp-id-001")
                    .username("employee1")
                    .role("EMPLOYEE")
                    .expiresIn(86400000L)
                    .message("Login successful")
                    .build();
        }

        // Try database if available
        Optional<User> userOpt = userRepository.findByUsername(loginRequest.getUsername());

        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        User user = userOpt.get();

        if (user.getIsActive() == null || !user.getIsActive()) {
            throw new RuntimeException("User account is inactive");
        }

        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        // Generate tokens
        String userRole = user.getRole() != null ? user.getRole().toString() : "EMPLOYEE";
        String token = jwtUtil.generateToken(user.getUsername(), user.getId(), userRole);
        String refreshToken = jwtUtil.generateRefreshToken(user.getUsername(), user.getId());

        // Update last login
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        log.info("User {} logged in successfully", user.getUsername());

        return LoginResponse.builder()
                .token(token)
                .refreshToken(refreshToken)
                .userId(user.getId())
                .username(user.getUsername())
                .role(userRole)
                .expiresIn(86400000L) // 24 hours
                .message("Login successful")
                .build();
    }

    public LoginResponse refreshToken(String refreshToken) {
        if (!jwtUtil.validateToken(refreshToken)) {
            throw new RuntimeException("Invalid or expired refresh token");
        }

        String username = jwtUtil.getUsernameFromToken(refreshToken);
        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        User user = userOpt.get();
        String userRole = user.getRole() != null ? user.getRole().toString() : "EMPLOYEE";

        String newToken = jwtUtil.generateToken(user.getUsername(), user.getId(), userRole);
        String newRefreshToken = jwtUtil.generateRefreshToken(user.getUsername(), user.getId());

        return LoginResponse.builder()
                .token(newToken)
                .refreshToken(newRefreshToken)
                .userId(user.getId())
                .username(user.getUsername())
                .role(userRole)
                .expiresIn(86400000L)
                .message("Token refreshed successfully")
                .build();
    }

    public void logout(String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            log.info("User {} logged out", userOpt.get().getUsername());
        }
    }

    public boolean validateToken(String token) {
        return jwtUtil.validateToken(token);
    }

    public String getUserIdFromToken(String token) {
        return jwtUtil.getUserIdFromToken(token);
    }

    public String getRoleFromToken(String token) {
        return jwtUtil.getRoleFromToken(token);
    }
}
