import { ParsedTranscript, Semester, ParsedCourse, CumulativeSummary } from "./types"

/**
 * Parse University of Bahrain transcript text into structured data
 */
export function parseUOBTranscript(rawText: string): ParsedTranscript {
    // Clean the text - remove page headers/footers
    const cleanedText = cleanTranscriptText(rawText)
    const lines = cleanedText.split("\n").map(line => line.trim()).filter(line => line.length > 0)

    // Extract student info
    const studentNumber = extractField(lines, "Student Number:")
    const studentName = extractStudentName(lines)
    const college = extractCollege(lines)
    const academicAdvisor = extractField(lines, "Academic Advisor:")
    const dateOfAdmission = extractDateOfAdmission(lines)

    // Extract program (use first semester's program as the main program)
    const semesters = extractSemesters(lines)
    
    // Calculate repeat counts for courses
    calculateRepeatCounts(semesters)
    
    const program = semesters.length > 0 ? semesters[0].program : undefined

    // Extract final cumulative GPA (from last occurrence)
    const cumulative = extractFinalCumulative(lines)

    return {
        studentName,
        studentNumber,
        college,
        program,
        academicAdvisor,
        dateOfAdmission,
        semesters,
        cumulative
    }
}

function cleanTranscriptText(text: string): string {
    const lines = text.split("\n")
    const cleaned: string[] = []

    for (const line of lines) {
        const trimmed = line.trim()
        
        // Skip page numbers and common footer/header text
        if (trimmed.match(/^Page \d+ of \d+$/)) continue
        if (trimmed.match(/^Print Date/)) continue
        if (trimmed.includes("Not To Be Used For Transfer")) continue
        if (trimmed.includes("Student Copy")) continue
        if (trimmed.match(/^University of Bahrain$/) && cleaned.length > 10) continue // Skip repeated headers
        if (trimmed === "Academic Transcript" && cleaned.length > 10) continue
        
        cleaned.push(line)
    }

    return cleaned.join("\n")
}

function extractField(lines: string[], fieldName: string): string {
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line.includes(fieldName)) {
            // Check if value is on the same line after the field name
            const sameLine = line.replace(fieldName, "").trim()
            if (sameLine && sameLine.length > 0 && !sameLine.includes(":")) {
                return sameLine.split("/")[0].trim()
            }
            
            // Otherwise check next line
            if (i + 1 < lines.length) {
                const nextLine = lines[i + 1].trim()
                if (nextLine && nextLine.length > 0) {
                    return nextLine.split("/")[0].trim()
                }
            }
        }
    }
    return ""
}

function extractStudentName(lines: string[]): string {
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line.includes("Student Name:")) {
            // Check if value is on the same line after the field name
            const sameLine = line.replace("Student Name:", "").trim()
            if (sameLine && sameLine.length > 0) {
                return sameLine.split("/")[0].trim()
            }
            
            // Otherwise check next line
            if (i + 1 < lines.length) {
                const nextLine = lines[i + 1].trim()
                if (nextLine && nextLine.length > 0) {
                    return nextLine.split("/")[0].trim()
                }
            }
        }
    }
    return ""
}

function extractCollege(lines: string[]): string {
    // Look for "College of" pattern
    const collegeLine = lines.find(line => line.includes("College of"))
    if (collegeLine) {
        return collegeLine.trim()
    }
    return ""
}

function extractDateOfAdmission(lines: string[]): string {
    const index = lines.findIndex(line => line.includes("Date of Admission:"))
    if (index !== -1 && index + 1 < lines.length) {
        // The date is in format "YYYY/YYYY" on next line, then "SemesterType" after
        const year = lines[index + 1]
        const semester = lines[index + 2]
        return `${year} ${semester}`.trim()
    }
    return ""
}

function extractSemesters(lines: string[]): Semester[] {
    const semesters: Semester[] = []
    const semesterPattern = /^\d{4}\/\d{4}$/

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // Check if this is a semester header (e.g., "2021/2022")
        if (semesterPattern.test(line) && i + 1 < lines.length) {
            const yearLine = line
            const semesterTypeLine = lines[i + 1]

            // Check if next line is semester type (First/Second/Summer Semester)
            if (semesterTypeLine.includes("Semester")) {
                const semesterName = `${yearLine} ${semesterTypeLine}`
                
                // Extract program name (next non-empty line that starts with "Bachelor" or similar)
                let program = ""
                for (let j = i + 2; j < i + 10 && j < lines.length; j++) {
                    if (lines[j].startsWith("Bachelor") || lines[j].startsWith("Master")) {
                        program = lines[j]
                        // Clean up the program name - remove orientation level info
                        program = program.replace(/\s*\(\s*Orientation level \d+\s*\)/i, "").trim()
                        break
                    }
                }

                // Extract courses and summary for this semester
                const semesterData = extractSemesterData(lines, i)
                
                semesters.push({
                    semesterName,
                    program,
                    courses: semesterData.courses,
                    semesterCreditsAttended: semesterData.creditsAttended,
                    semesterCreditsPassed: semesterData.creditsPassed,
                    sgpa: semesterData.sgpa
                })
            }
        }
    }

    return semesters
}

function extractSemesterData(lines: string[], startIndex: number) {
    const courses: ParsedCourse[] = []
    let creditsAttended = 0
    let creditsPassed = 0
    let sgpa = 0

    // Find the next semester or end of data
    let endIndex = lines.length
    for (let i = startIndex + 1; i < lines.length; i++) {
        if (/^\d{4}\/\d{4}$/.test(lines[i])) {
            endIndex = i
            break
        }
    }

    // Find where courses start (after "Course No." header)
    let coursesStart = -1
    for (let i = startIndex; i < endIndex; i++) {
        if (lines[i].includes("Course No.") || lines[i].includes("Course Name")) {
            coursesStart = i + 1
            break
        }
    }

    if (coursesStart === -1) {
        coursesStart = startIndex + 3 // Fallback
    }

    // Parse courses line by line, handling multi-line course codes
    let i = coursesStart
    while (i < endIndex) {
        const line = lines[i]

        // Stop when we hit semester summary
        if (line.includes("Semester Cr. Attended")) {
            break
        }

        // Look for course code pattern
        if (/^[A-Z]{2,10}$/.test(line)) {
            const courseData = extractCourseFromLines(lines, i, endIndex)
            if (courseData) {
                courses.push(courseData.course)
                i = courseData.nextIndex
                continue
            }
        }

        i++
    }

    // Extract semester summary - look from the end backwards
    for (let i = endIndex - 1; i >= startIndex; i--) {
        const line = lines[i]
        
        if (line.includes("Semester Cr. Attended:")) {
            // Could be "Semester Cr. Attended: 12" on same line
            const match = line.match(/Semester Cr\. Attended:\s*(\d+)/)
            if (match) {
                creditsAttended = parseInt(match[1], 10)
            }
            // Check if Passed is on the same line
            const passedMatch = line.match(/Passed:\s*(\d+)/)
            if (passedMatch) {
                creditsPassed = parseInt(passedMatch[1], 10)
            }
            // Check if SGPA is on the same line
            const sgpaMatch = line.match(/SGPA:\s*([\d.]+)/)
            if (sgpaMatch) {
                sgpa = parseFloat(sgpaMatch[1])
            }
        }
        
        // Also check individual lines for these values
        if (line.includes("Passed:") && !line.includes("Cumulative") && creditsPassed === 0) {
            const match = line.match(/Passed:\s*(\d+)/)
            if (match) creditsPassed = parseInt(match[1], 10)
        }
        if (line.includes("SGPA:") && sgpa === 0) {
            const match = line.match(/SGPA:\s*([\d.]+)/)
            if (match) sgpa = parseFloat(match[1])
        }
    }

    return { courses, creditsAttended, creditsPassed, sgpa }
}

function extractCourseFromLines(lines: string[], startIndex: number, endIndex: number): { course: ParsedCourse; nextIndex: number } | null {
    // Course structure in PDF:
    // Line 1: Course prefix (ARAB, ENGL, etc.)
    // Line 2: Course number (110, 154, etc.)
    // Line 3: Course name (ARABIC LANGUAGE SKILLS, etc.)
    // Line 4: Credit hours (3, 0, etc.)
    // Line 5: Grade (A, B+, W, etc.)
    // Line 6: Optional status/rep marker
    
    const coursePrefix = lines[startIndex].trim()
    let i = startIndex + 1
    
    // Skip empty lines
    while (i < endIndex && !lines[i].trim()) i++
    if (i >= endIndex) return null
    
    // Get course number
    const courseNumber = lines[i].trim()
    if (!/^\d{3}/.test(courseNumber)) return null
    
    i++
    while (i < endIndex && !lines[i].trim()) i++
    if (i >= endIndex) return null
    
    // Get course name (might span multiple lines until we hit a number)
    let courseName = ""
    while (i < endIndex) {
        const line = lines[i].trim()
        
        // Stop if we hit credit hours (a single digit line)
        if (/^\d+$/.test(line)) {
            break
        }
        
        // Stop if we hit another course code
        if (/^[A-Z]{2,10}$/.test(line) && i + 1 < endIndex && /^\d{3}/.test(lines[i + 1])) {
            break
        }
        
        // Stop if we hit semester summary
        if (line.includes("Semester Cr. Attended") || line.includes("SGPA")) {
            break
        }
        
        // Add to course name
        if (line) {
            courseName += (courseName ? " " : "") + line
        }
        
        i++
    }
    
    if (i >= endIndex) return null
    
    // Get credit hours
    const creditLine = lines[i].trim()
    const creditHours = /^\d+$/.test(creditLine) ? parseInt(creditLine, 10) : 0
    
    i++
    while (i < endIndex && !lines[i].trim()) i++
    if (i >= endIndex) return null
    
    // Get grade
    const gradeLine = lines[i].trim()
    let grade = ""
    if (/^[A-FW][+-]?$/.test(gradeLine) || gradeLine === "W" || gradeLine === "IP" || gradeLine === "P" || gradeLine === "F") {
        grade = gradeLine
    }
    
    i++
    
    // Check for status (W for withdrawn, Rep for repeated, etc.)
    // If grade is W, status is also W (withdrawn)
    let status = ""
    let repeated = false
    
    if (grade === "W") {
        status = "W"
    }
    
    if (i < endIndex) {
        const statusLine = lines[i].trim()
        if (statusLine === "W" || statusLine === "Enrolled" || statusLine.includes("Rep")) {
            if (statusLine !== "W" || status !== "W") { // Don't duplicate W status
                status = statusLine
            }
            if (statusLine === "Rep" || statusLine.includes("Rep")) {
                repeated = true
            }
            i++
        }
    }
    
    const courseCode = `${coursePrefix} ${courseNumber}`.trim()
    
    return {
        course: {
            courseCode,
            courseName: courseName.trim(),
            creditHours,
            grade: grade || "N/A",
            status: status || undefined,
            repeated,
            repeatCount: 0 // Will be calculated later
        },
        nextIndex: i
    }
}

function parseCourseLine(line: string): { courseName: string; creditHours: number; grade: string; status: string; repeated: boolean } {
    // This function is now deprecated but kept for compatibility
    return {
        courseName: "",
        creditHours: 0,
        grade: "",
        status: "",
        repeated: false
    }
}

function extractFinalCumulative(lines: string[]): CumulativeSummary | undefined {
    // Find the last occurrence of cumulative data
    let creditsAttended = 0
    let creditsPassed = 0
    let cgpa = 0
    let mcgpa = 0

    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i]

        if (line.includes("Cumulative Cr. Attended:")) {
            const match = line.match(/Cumulative Cr\. Attended:\s*(\d+)/)
            if (match) {
                creditsAttended = parseInt(match[1], 10)
            }
            // Check if Passed is on the same line
            const passedMatch = line.match(/Passed:\s*(\d+)/)
            if (passedMatch) {
                creditsPassed = parseInt(passedMatch[1], 10)
            }
            // Check if CGPA is on the same line
            const cgpaMatch = line.match(/CGPA:\s*([\d.]+)/)
            if (cgpaMatch) {
                cgpa = parseFloat(cgpaMatch[1])
            }
        }
        
        if (line.includes("Passed:") && line.includes("Cumulative") && creditsPassed === 0) {
            const match = line.match(/Passed:\s*(\d+)/)
            if (match) creditsPassed = parseInt(match[1], 10)
        }
        if (line.includes("CGPA:") && cgpa === 0) {
            const match = line.match(/CGPA:\s*([\d.]+)/)
            if (match) cgpa = parseFloat(match[1])
        }
        if (line.includes("MCGPA:") && mcgpa === 0) {
            const match = line.match(/MCGPA:\s*([\d.]+)/)
            if (match) mcgpa = parseFloat(match[1])
        }

        // If we found CGPA, we've likely found all cumulative data
        if (cgpa > 0 && creditsAttended > 0) {
            break
        }
    }

    if (creditsAttended > 0 || cgpa > 0) {
        return {
            creditsAttended,
            creditsPassed,
            cgpa,
            mcgpa
        }
    }

    return undefined
}

function calculateRepeatCounts(semesters: Semester[]): void {
    // Track how many times each course appears
    const courseOccurrences: Map<string, number> = new Map()
    
    // Count occurrences across all semesters
    for (const semester of semesters) {
        for (const course of semester.courses) {
            const count = courseOccurrences.get(course.courseCode) || 0
            courseOccurrences.set(course.courseCode, count + 1)
        }
    }
    
    // Update repeat counts - if a course appears multiple times, later occurrences are repeats
    const courseSeen: Map<string, number> = new Map()
    
    for (const semester of semesters) {
        for (const course of semester.courses) {
            const seenCount = courseSeen.get(course.courseCode) || 0
            courseSeen.set(course.courseCode, seenCount + 1)
            
            // If this is the first time seeing the course, repeatCount = 0
            // If second time, repeatCount = 1, etc.
            course.repeatCount = seenCount
            
            // Mark as repeated if it appears more than once
            if (seenCount > 0) {
                course.repeated = true
            }
        }
    }
}
