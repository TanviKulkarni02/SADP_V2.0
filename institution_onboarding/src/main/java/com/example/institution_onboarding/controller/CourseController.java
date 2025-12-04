package com.example.institution_onboarding.controller;

import com.example.institution_onboarding.dto.CourseRequest;
import com.example.institution_onboarding.entity.InstitutionCourse;
import com.example.institution_onboarding.service.CourseService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseService courseService;

    @PostMapping("/{institutionId}/add")
    public InstitutionCourse addCourse(
            @PathVariable Long institutionId,
            @RequestBody CourseRequest courseRequest
    ) {
        return courseService.addCourse(institutionId, courseRequest);
    }
}
