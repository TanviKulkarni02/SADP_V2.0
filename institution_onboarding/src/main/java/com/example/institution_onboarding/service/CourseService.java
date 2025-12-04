package com.example.institution_onboarding.service;

import com.example.institution_onboarding.dto.CourseRequest;
import com.example.institution_onboarding.entity.Institution;
import com.example.institution_onboarding.entity.InstitutionCourse;
import com.example.institution_onboarding.exception.NotFoundException;
import com.example.institution_onboarding.repository.InstitutionCourseRepository;
import com.example.institution_onboarding.repository.InstitutionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final InstitutionRepository institutionRepository;
    private final InstitutionCourseRepository courseRepository;

    public InstitutionCourse addCourse(Long institutionId, CourseRequest request) {
        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new NotFoundException("Institution not found"));

        InstitutionCourse course = InstitutionCourse.builder()
                .courseName(request.getCourseName())
                .courseDescription(request.getCourseDescription())
                .institution(institution)
                .build();

        return courseRepository.save(course);
    }
}
