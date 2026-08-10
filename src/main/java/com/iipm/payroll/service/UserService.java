package com.iipm.payroll.service;

import com.iipm.payroll.dto.UserDTO;
import com.iipm.payroll.model.User;
import com.iipm.payroll.model.UserRole;
import com.iipm.payroll.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private NotificationService notificationService;

    public User createUser(UserDTO userDTO, String createdBy) {
        // Check if user already exists
        if (userRepository.existsByUsername(userDTO.getUsername())) {
            throw new RuntimeException("Username already exists");
        }

        if (userRepository.existsByEmployeeId(userDTO.getEmployeeId())) {
            throw new RuntimeException("Employee ID already exists");
        }

        User user = User.builder()
                .username(userDTO.getUsername())
                .password(passwordEncoder.encode("defaultPassword123")) // Default password - should be changed on first login
                .employeeId(userDTO.getEmployeeId())
                .firstName(userDTO.getFirstName())
                .lastName(userDTO.getLastName())
                .email(userDTO.getEmail())
                .phone(userDTO.getPhone())
                .designation(userDTO.getDesignation())
                .department(userDTO.getDepartment())
                .payLevel(userDTO.getPayLevel())
                .payIndex(userDTO.getPayIndex())
                .basicPay(userDTO.getBasicPay())
                .bankAccountNumber(userDTO.getBankAccountNumber())
                .ifscCode(userDTO.getIfscCode())
                .bankName(userDTO.getBankName())
                .pan(userDTO.getPan())
                .aadhar(userDTO.getAadhar())
                .role(UserRole.valueOf(userDTO.getRole()))
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .createdBy(createdBy)
                .updatedBy(createdBy)
                .build();

        User savedUser = userRepository.save(user);
        log.info("User created: {} ({})", user.getUsername(), user.getEmployeeId());

        return savedUser;
    }

    public User updateUser(String userId, UserDTO userDTO, String updatedBy) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        User user = userOpt.get();

        if (!user.getUsername().equals(userDTO.getUsername()) && userRepository.existsByUsername(userDTO.getUsername())) {
            throw new RuntimeException("Username already exists");
        }

        user.setFirstName(userDTO.getFirstName());
        user.setLastName(userDTO.getLastName());
        user.setEmail(userDTO.getEmail());
        user.setPhone(userDTO.getPhone());
        user.setProfilePicture(userDTO.getProfilePicture());
        user.setDesignation(userDTO.getDesignation());
        user.setDepartment(userDTO.getDepartment());
        user.setPayLevel(userDTO.getPayLevel());
        user.setPayIndex(userDTO.getPayIndex());
        user.setBasicPay(userDTO.getBasicPay());
        user.setBankAccountNumber(userDTO.getBankAccountNumber());
        user.setIfscCode(userDTO.getIfscCode());
        user.setBankName(userDTO.getBankName());
        user.setPan(userDTO.getPan());
        user.setAadhar(userDTO.getAadhar());
        if (userDTO.getRole() != null) {
            user.setRole(UserRole.valueOf(userDTO.getRole()));
        }
        user.setIsActive(userDTO.isActive());
        user.setUpdatedAt(LocalDateTime.now());
        user.setUpdatedBy(updatedBy);

        User updated = userRepository.save(user);
        log.info("User updated: {}", user.getUsername());

        return updated;
    }

    public void deleteUser(String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setIsActive(false);
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
            log.info("User deactivated: {}", user.getUsername());
        }
    }

    public User getUserById(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public List<User> getUsersByRole(UserRole role) {
        return userRepository.findActiveByRole(role);
    }

    public List<UserDTO> getAllEmployees() {
        List<User> employees = userRepository.findActiveByRole(UserRole.EMPLOYEE);
        return employees.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    public List<User> createBulkUsers(List<UserDTO> userDTOs, String createdBy) {
        return userDTOs.stream().map(dto -> createUser(dto, createdBy)).collect(Collectors.toList());
    }

    public void deleteBulkUsers(List<String> userIds) {
        userIds.forEach(this::deleteUser);
    }

    public void changePassword(String userId, String oldPassword, String newPassword) {
        User user = getUserById(userId);

        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new RuntimeException("Old password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        log.info("Password changed for user: {}", user.getUsername());
    }

    public void resetPassword(String userId, String newPassword) {
        User user = getUserById(userId);
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        log.info("Password reset for user: {}", user.getUsername());
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
                .profilePicture(user.getProfilePicture())
                .designation(user.getDesignation())
                .department(user.getDepartment())
                .basicPay(user.getBasicPay())
                .bankAccountNumber(user.getBankAccountNumber())
                .ifscCode(user.getIfscCode())
                .bankName(user.getBankName())
                .pan(user.getPan())
                .aadhar(user.getAadhar())
                .role(user.getRole().toString())
                .isActive(user.getIsActive() != null && user.getIsActive())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }
}
