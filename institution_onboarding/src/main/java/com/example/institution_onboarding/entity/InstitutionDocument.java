package com.example.institution_onboarding.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InstitutionDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fileName;      // uploaded file name
    private String fileType;      // pdf, jpg, png
    private String filePath;      // path where file is stored

    @ManyToOne
    @JoinColumn(name = "institution_id")
    private Institution institution;
}
