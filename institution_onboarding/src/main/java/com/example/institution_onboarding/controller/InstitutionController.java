package com.example.institution_onboarding.controller;

import com.example.institution_onboarding.dto.InstitutionRequest;
import com.example.institution_onboarding.entity.Institution;
import com.example.institution_onboarding.entity.InstitutionCourse;
import com.example.institution_onboarding.entity.InstitutionDocument;
import com.example.institution_onboarding.service.InstitutionService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/institutions")
@RequiredArgsConstructor
public class InstitutionController {

    private final InstitutionService service;

    // ----------------------------------------
    // Helper Methods
    // ----------------------------------------
    private String getRole() {
        return SecurityContextHolder.getContext()
                .getAuthentication()
                .getAuthorities()
                .iterator()
                .next()
                .getAuthority();
    }

    private String getUsername() {
        return SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();
    }


    // ----------------------------------------
    // PUBLIC: Register Institution
    // ----------------------------------------
    @PostMapping("/register")
    public Institution register(@RequestBody InstitutionRequest request) {
        return service.register(request);
    }


    // ----------------------------------------
    // INSTITUTION: View Status
    // ----------------------------------------
    @GetMapping("/{id}/status")
    public String getStatus(@PathVariable Long id) {

        String role = getRole();
        String username = getUsername();

        if (!"INSTITUTION".equals(role))
            throw new RuntimeException("Only institutions can view status");

        service.validateInstitutionAccess(id, username);

        return service.getStatus(id).getStatus().toString();
    }


    // ----------------------------------------
    // ADMIN: Verify Institution
    // ----------------------------------------
    @PostMapping("/{id}/verify")
    public Institution verifyInstitution(
            @PathVariable Long id,
            @RequestParam boolean approve,
            @RequestParam(required = false) String reason
    ) {
        String role = getRole();

        if (!"ADMIN".equals(role))
            throw new RuntimeException("Only ADMIN can verify institutions");

        return service.verify(id, approve, reason);
    }


    // ----------------------------------------
    // ADMIN: List Documents
    // ----------------------------------------
    @GetMapping("/{id}/documents")
    public List<InstitutionDocument> getDocuments(@PathVariable Long id) {

        String role = getRole();

        if (!"ADMIN".equals(role))
            throw new RuntimeException("Only admin can list documents");

        return service.getDocuments(id);
    }


    // ----------------------------------------
    // ADMIN: Download Document
    // ----------------------------------------
    @GetMapping("/{institutionId}/documents/{docId}")
    public byte[] downloadDocument(
            @PathVariable Long institutionId,
            @PathVariable Long docId
    ) {
        String role = getRole();

        if (!"ADMIN".equals(role))
            throw new RuntimeException("Only admin can download documents");

        return service.downloadDocument(institutionId, docId);
    }


    // ----------------------------------------
    // INSTITUTION: Upload Document
    // ----------------------------------------
    @PostMapping("/{id}/documents/upload")
    public InstitutionDocument uploadDocument(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file
    ) {
        String role = getRole();
        String username = getUsername();

        if (!"INSTITUTION".equals(role)) {
            throw new RuntimeException("Only institutions can upload documents");
        }

        service.validateInstitutionAccess(id, username);

        return service.uploadDocument(id, file);
    }
    // ----------------------------------------
// INSTITUTION: Add Course (Only AFTER APPROVAL)
// ----------------------------------------
    @PostMapping("/{id}/courses")
    public InstitutionCourse addCourse(
            @PathVariable Long id,
            @RequestBody InstitutionCourse course
    ) {
        String role = getRole();
        String username = getUsername();

        if (!"INSTITUTION".equals(role)) {
            throw new RuntimeException("Only institutions can add courses");
        }

        // Ensure the logged-in institution is the same
        service.validateInstitutionAccess(id, username);

        // Optional: Ensure institution is APPROVED
        Institution inst = service.getStatus(id);
        if (!inst.getStatus().toString().equals("APPROVED")) {
            throw new RuntimeException("Institution is not approved yet");
        }

        return service.addCourse(id, course);
    }

}
