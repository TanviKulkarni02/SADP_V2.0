package com.example.institution_onboarding.service;

import com.example.institution_onboarding.dto.InstitutionRequest;
import com.example.institution_onboarding.entity.*;
import com.example.institution_onboarding.exception.NotFoundException;
import com.example.institution_onboarding.repository.*;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.List;

@Service
@RequiredArgsConstructor

public class InstitutionService {

    private final InstitutionRepository institutionRepository;
    private final InstitutionCourseRepository courseRepository;
    private final InstitutionDocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${file.upload-dir}")
    private String uploadDir;

    // ------------------------------------------------------------
    public Institution register(InstitutionRequest request) {

        // ---- server-side validation ----
        // check if email is already registered as an institution
        if (institutionRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Institution with this email already registered");
        }

        // check if a user with same username exists (to be safe)
        if (userRepository.findByUsername(request.getEmail()).isPresent()) {
            throw new RuntimeException("User with this email already exists");
        }

        // validate password (server-side)
        String pw = request.getPassword();
        if (pw == null || !pw.matches("^(?=.*[A-Z])(?=.*\\d).{8,}$")) {
            throw new RuntimeException("Password must be at least 8 chars, contain one uppercase and one digit.");
        }
        // Auto-generate registration number
        String regNumber = "INST-" + System.currentTimeMillis();

        Institution institution = Institution.builder()
                .name(request.getName())
                .type(request.getType())
                .email(request.getEmail())
                .phone(request.getPhone())
                .registrationNumber(regNumber)   // <-- auto-generated
                .address(request.getAddress())
                .website(request.getWebsite())
                .status(Status.PENDING)
                .build();

        Institution saved = institutionRepository.save(institution);

        // Create login credentials
        User user = User.builder()
                .username(request.getEmail())
                .password(passwordEncoder.encode(pw))
                .role(UserRole.INSTITUTION)
                .build();

        userRepository.save(user);

        return saved;
    }

    // ------------------------------------------------------------
    public Institution getStatus(Long id) {
        return institutionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Institution not found"));
    }

    // ------------------------------------------------------------
    public Institution verify(Long id, boolean approve, String reason) {

        Institution inst = institutionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Institution not found"));

        if (approve) {
            inst.setStatus(Status.APPROVED);
            inst.setRejectionReason(null);
        } else {
            inst.setStatus(Status.REJECTED);
            inst.setRejectionReason(reason);
        }

        return institutionRepository.save(inst);
    }

    // ------------------------------------------------------------
    public List<InstitutionDocument> getDocuments(Long id) {
        Institution inst = institutionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Institution not found"));
        return documentRepository.findByInstitution(inst);
    }

    // ------------------------------------------------------------
    public byte[] downloadDocument(Long institutionId, Long docId) {

        InstitutionDocument doc = documentRepository.findById(docId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        try {
            return Files.readAllBytes(new File(doc.getFilePath()).toPath());
        } catch (Exception e) {
            throw new RuntimeException("Unable to read file");
        }
    }

    // ------------------------------------------------------------
    public void validateInstitutionAccess(Long id, String username) {
        Institution inst = institutionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Institution not found"));

        if (!inst.getEmail().equals(username)) {
            throw new RuntimeException("Access denied");
        }
    }
    public InstitutionDocument uploadDocument(Long institutionId, MultipartFile file) {
        try {
            Institution institution = institutionRepository.findById(institutionId)
                    .orElseThrow(() -> new RuntimeException("Institution not found"));

            // Create upload directory if missing
            File folder = new File(uploadDir);
            if (!folder.exists()) {
                folder.mkdirs();
            }

            // Save file to disk
            String filePath = uploadDir + "/" + System.currentTimeMillis() + "_" + file.getOriginalFilename();
            File savedFile = new File(filePath);
            file.transferTo(savedFile);

            // Store path & file info in DB
            InstitutionDocument doc = new InstitutionDocument();
            doc.setInstitution(institution);
            doc.setFileName(file.getOriginalFilename());
            doc.setFilePath(filePath);

            return documentRepository.save(doc);

        } catch (IOException e) {
            throw new RuntimeException("File upload failed");
        }
    }
    public InstitutionCourse addCourse(Long institutionId, InstitutionCourse course) {

        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new RuntimeException("Institution not found"));

        course.setInstitution(institution);

        return courseRepository.save(course);
    }

    //method to fetch the courses enrolled, from the frontend
    public List<InstitutionCourse> getCourses(Long institutionId) {
        Institution inst = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new RuntimeException("Institution not found"));

        return courseRepository.findByInstitution(inst);
    }

    // --------------------------------------------
// ADMIN: Get all pending institution requests
// --------------------------------------------
    public List<Institution> getPendingInstitutions() {
        return institutionRepository.findByStatus(Status.PENDING);
    }




}
