package com.example.institution_onboarding.dto;

import lombok.Data;

@Data
public class InstitutionRequest {
    private String name;
    private String type;
    private String email;
    private String phone;
    private String address;
    private String website;
    private String password; // NEW
}
