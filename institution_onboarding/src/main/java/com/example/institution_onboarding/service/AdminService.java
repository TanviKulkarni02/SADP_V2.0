package com.example.institution_onboarding.service;

import com.example.institution_onboarding.entity.Admin;
import com.example.institution_onboarding.repository.AdminRepository;
import com.example.institution_onboarding.security.JwtUtil;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final AdminRepository repo;
    private final JwtUtil jwtUtil;

    public String login(String username, String password) {

        // Fetch admin from DB
        Admin admin = repo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        // Validate password
        if (!admin.getPassword().equals(password)) {
            throw new RuntimeException("Invalid password");
        }

        // ⭐ FIX: generateToken(username, role)
        return jwtUtil.generateToken(admin.getUsername(), "ADMIN");
    }
}
