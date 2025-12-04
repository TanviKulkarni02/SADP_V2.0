package com.example.institution_onboarding.repository;

import com.example.institution_onboarding.entity.Institution;
import com.example.institution_onboarding.entity.InstitutionCourse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InstitutionCourseRepository extends JpaRepository<InstitutionCourse, Long> {
    List<InstitutionCourse> findByInstitution(Institution institution);

}
