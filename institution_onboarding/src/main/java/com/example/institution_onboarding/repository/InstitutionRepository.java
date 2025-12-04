package com.example.institution_onboarding.repository;

import com.example.institution_onboarding.entity.Institution;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InstitutionRepository extends JpaRepository<Institution, Long> {
}
