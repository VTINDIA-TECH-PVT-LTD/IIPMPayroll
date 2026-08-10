package com.iipm.payroll;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableMongoRepositories(basePackages = "com.iipm.payroll.repository")
@ComponentScan(basePackages = "com.iipm.payroll")
@EnableAsync
public class IipmPayrollApplication {

    public static void main(String[] args) {
        SpringApplication.run(IipmPayrollApplication.class, args);
    }
}
