// Transcript parsing types for University of Bahrain transcripts

export interface ParsedCourse {
    courseCode: string
    courseName: string
    creditHours: number
    grade: string
    status?: string // e.g., "W" for withdrawn, "Enrolled", etc.
    repeated?: boolean
}

export interface Semester {
    semesterName: string // e.g., "2021/2022 First Semester"
    program?: string // e.g., "Bachelor of Science in Information Systems - 2017"
    courses: ParsedCourse[]
    semesterCreditsAttended?: number
    semesterCreditsPassed?: number
    sgpa?: number // Semester GPA
}

export interface CumulativeSummary {
    creditsAttended: number
    creditsPassed: number
    cgpa: number // Cumulative GPA
    mcgpa?: number // Major CGPA
    igpa?: number // Institution GPA
}

export interface ParsedTranscript {
    studentName: string
    studentNumber: string
    college?: string
    program?: string
    dateOfAdmission?: string
    academicAdvisor?: string
    semesters: Semester[]
    cumulative?: CumulativeSummary
}

export interface TranscriptParseResult {
    success: boolean
    data?: ParsedTranscript
    rawText?: string
    error?: string
}
