package com.example.institution_onboarding.repository;

import com.example.institution_onboarding.entity.Institution;
import com.example.institution_onboarding.entity.InstitutionDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InstitutionDocumentRepository extends JpaRepository<InstitutionDocument, Long> {

    // ⭐ Needed by InstitutionService
    List<InstitutionDocument> findByInstitution(Institution institution);
}
