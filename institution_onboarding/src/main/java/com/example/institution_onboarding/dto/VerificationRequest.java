package com.example.institution_onboarding.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VerificationRequest {

    private boolean approve;      // true = approve, false = reject
    private String reason;        // required only if approve == false
}
