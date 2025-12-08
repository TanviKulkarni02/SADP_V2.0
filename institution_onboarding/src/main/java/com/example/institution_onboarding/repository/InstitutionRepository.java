package com.example.institution_onboarding.repository;

import com.example.institution_onboarding.entity.Institution;
import com.example.institution_onboarding.entity.Status;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InstitutionRepository extends JpaRepository<Institution, Long> {
    Optional<Institution> findByEmail(String email);
    List<Institution> findByStatus(Status status);
}
