package com.iipm.payroll.config;

import com.iipm.payroll.model.User;
import com.iipm.payroll.model.UserRole;
import com.iipm.payroll.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner initDatabase(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            createUserIfNotFound(userRepository, passwordEncoder, "IIPMAdmin", "IIPM@_#2026", UserRole.SUPER_ADMIN, "EMP001", "Super", "Admin");
            createUserIfNotFound(userRepository, passwordEncoder, "FA_Admin", "FA_Admin@=_2026", UserRole.FA_ADMIN, "EMP002", "F&A", "Admin");
            createUserIfNotFound(userRepository, passwordEncoder, "FA_Operator", "FA_Operator@+*2026", UserRole.FA_OPERATOR, "EMP003", "F&A", "Operator");
            createUserIfNotFound(userRepository, passwordEncoder, "Adm_Admin", "Adm_Admin@=_2026", UserRole.ADMIN_ADMIN, "EMP004", "Administration", "Admin");
            createUserIfNotFound(userRepository, passwordEncoder, "Adm_Operator", "Adm_Operator@+*2026", UserRole.ADMIN_OPERATOR, "EMP005", "Administration", "Operator");
        };
    }

    private void createUserIfNotFound(UserRepository userRepository, PasswordEncoder passwordEncoder, String username, String password, UserRole role, String empId, String firstName, String lastName) {
        if (!userRepository.findByUsername(username).isPresent()) {
            User user = User.builder()
                    .username(username)
                    .password(passwordEncoder.encode(password))
                    .role(role)
                    .employeeId(empId)
                    .firstName(firstName)
                    .lastName(lastName)
                    .email(username.toLowerCase() + "@iipm.ac.in")
                    .isActive(true)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            userRepository.save(user);
        }
    }
}
