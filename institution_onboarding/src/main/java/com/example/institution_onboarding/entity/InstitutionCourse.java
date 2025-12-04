package com.example.institution_onboarding.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InstitutionCourse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String courseName;
    private String courseDescription;

    @ManyToOne
    @JoinColumn(name = "institution_id")
    private Institution institution;
}
