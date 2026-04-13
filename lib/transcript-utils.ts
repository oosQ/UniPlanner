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

    // Detect semester format
    let isTableFormat = false
    let isVerticalFormat = false
    let hasGradesBeforeCourses = false
    
    for (let j = coursesStart; j < Math.min(coursesStart + 20, endIndex); j++) {
        const line = lines[j].trim()
        
        // Format 1: Table format (orientation) - compact course codes before Credit Hrs header
        if (line === "Credit Hrs." || line === "Credit Hrs") {
            for (let k = coursesStart; k < j; k++) {
                if (/^[A-Z]+\s+\d{3}$/.test(lines[k].trim())) {
                    isTableFormat = true
                    break
                }
            }
            
            // Format 2: Vertical format - course code appears before "Course Name" header
            // Check if we have a course code before this header
            for (let k = coursesStart; k < j; k++) {
                if (/^[A-Z]{2,10}$/.test(lines[k].trim()) && k + 1 < j && /^\d{3}$/.test(lines[k + 1].trim())) {
                    // Check if "Course Name" header appears after the course code
                    for (let m = k; m < j; m++) {
                        if (lines[m].trim() === "Course Name") {
                            isVerticalFormat = true
                            break
                        }
                    }
                }
            }
            break
        }
        
        // Format 3: Columnar format - ALL grades appear as values after "Grade" header, before ALL course data
        // Check if we have 2+ grades in sequence - that indicates true columnar format
        if (line === "Grade" && j + 3 < endIndex) {
            const nextLine = lines[j + 1].trim()
            const lineAfterNext = lines[j + 2].trim()
            // Check if we have 2 consecutive grades (not course codes)
            if ((/^[A-F][+-]?$/.test(nextLine) || nextLine === "I") && 
                (/^[A-F][+-]?$/.test(lineAfterNext) || lineAfterNext === "I" || lineAfterNext === "W") &&
                !/^[A-Z]{2,10}$/.test(lineAfterNext)) {
                hasGradesBeforeCourses = true
                break
            }
        }
    }
    
    // Handle different formats
    if (isVerticalFormat) {
        return extractVerticalFormattedCourses(lines, coursesStart, endIndex, startIndex)
    }
    
    if (isTableFormat) {
        return extractTableFormattedCourses(lines, coursesStart, endIndex, startIndex)
    }
    
    if (hasGradesBeforeCourses) {
        return extractColumnarFormattedCourses(lines, coursesStart, endIndex, startIndex)
    }

    // Check if there are any pre-listed grades after "Grade" header (even if just 1)
    const preListedGrades: string[] = []
    let gradeHeaderIndex = -1
    
    for (let j = coursesStart; j < Math.min(coursesStart + 15, endIndex); j++) {
        const line = lines[j].trim()
        if (line === "Grade") {
            gradeHeaderIndex = j
            // Collect grades after "Grade" header until we hit a course code
            for (let k = j + 1; k < Math.min(j + 10, endIndex); k++) {
                const gradeLine = lines[k].trim()
                if (gradeLine === "") continue
                
                // If we hit a course prefix, stop collecting
                if (/^[A-Z]{2,10}$/.test(gradeLine)) {
                    // Check if next line is a course number
                    if (k + 1 < endIndex && /^\d{3}/.test(lines[k + 1].trim())) {
                        break
                    }
                }
                
                // Collect valid grades
                if (/^[A-F][+-]?$/.test(gradeLine) || gradeLine === "I" || gradeLine === "IP" || gradeLine === "P" || gradeLine === "F") {
                    preListedGrades.push(gradeLine)
                } else if (gradeLine !== "Grade") {
                    // If it's not a grade and not a blank, we're done
                    break
                }
            }
            break
        }
    }

    // Parse courses line by line, handling multi-line course codes
    let i = coursesStart
    while (i < endIndex) {
        const line = lines[i].trim()

        // Stop when we hit semester summary or status section
        if (line.includes("Semester Cr. Attended") || line === "Status" || line === "Rep.") {
            break
        }
        
        // Skip column headers and common non-course lines
        if (line === "Course No." || line === "Course Name" || line === "Credit Hrs." || 
            line === "Grade" || line === "Status" || line === "Rep." || line === "Enrolled") {
            i++
            continue
        }

        // Look for course code pattern
        // Case 1: Compact format like "ENGLRL 002" or "MATHS 001"
        if (/^[A-Z]+\s+\d{3}$/.test(line)) {
            const courseData = extractCourseFromLines(lines, i, endIndex)
            if (courseData) {
                courses.push(courseData.course)
                i = courseData.nextIndex
                continue
            }
        }
        
        // Case 2: Normal format - course prefix on its own line (but not a header)
        if (/^[A-Z]{2,10}$/.test(line) && line !== "Status" && line !== "Grade") {
            // Peek ahead - next line should be a course number
            if (i + 1 < endIndex && /^\d{3}/.test(lines[i + 1].trim())) {
                const courseData = extractCourseFromLines(lines, i, endIndex)
                if (courseData) {
                    courses.push(courseData.course)
                    i = courseData.nextIndex
                    continue
                }
            }
        }

        i++
    }
    
    // First, assign pre-listed grades to courses without inline grades (in order)
    let preGradeIndex = 0
    for (const course of courses) {
        if ((!course.grade || course.grade === "" || course.grade === "N/A") && preGradeIndex < preListedGrades.length) {
            course.grade = preListedGrades[preGradeIndex]
            preGradeIndex++
        }
    }
    
    // Now handle Status/Rep section where additional grades/statuses appear
    // For courses without grades, the grade or status appears in the Status section
    const statusSectionStart = i
    const statusValues: string[] = []
    
    for (let j = statusSectionStart; j < endIndex && j < statusSectionStart + 20; j++) {
        const line = lines[j].trim()
        
        // Stop when we hit semester summary
        if (line === "Semester Cr. Attended" || line.includes("Semester Cr.")) {
            break
        }
        
        // Skip headers but continue collecting
        if (line === "Status" || line === "Rep." || line === "Grade" || line === "") {
            continue
        }
        
        // Collect status/grade values (W, I, grades like B-, A+, etc.)
        if (line === "W" || /^[A-F][+-]?$/.test(line) || line === "IP" || line === "I" || line === "P" || line === "F") {
            statusValues.push(line)
        }
    }
    
    // Assign status values to courses without grades, in order
    let statusIndex = 0
    for (const course of courses) {
        if ((!course.grade || course.grade === "" || course.grade === "N/A") && statusIndex < statusValues.length) {
            const value = statusValues[statusIndex]
            
            if (value === "W") {
                course.status = "W"
                course.grade = "N/A"
            } else if (/^[A-F][+-]?$/.test(value) || value === "IP" || value === "I" || value === "P" || value === "F") {
                course.grade = value
            }
            
            statusIndex++
        }
    }

    // Extract semester summary - values are on separate lines after labels
    for (let i = startIndex; i < endIndex; i++) {
        const line = lines[i].trim()
        
        if (line === "Semester Cr. Attended:" && i + 2 < endIndex) {
            // Skip blank line, then get the number
            const valueIndex = lines[i + 1].trim() === "" ? i + 2 : i + 1
            if (valueIndex < endIndex) {
                const value = lines[valueIndex].trim()
                if (/^\d+$/.test(value)) {
                    creditsAttended = parseInt(value, 10)
                }
            }
        }
        
        if (line === "Passed:" && i + 2 < endIndex && !lines[i - 1]?.includes("Cumulative")) {
            const valueIndex = lines[i + 1].trim() === "" ? i + 2 : i + 1
            if (valueIndex < endIndex) {
                const value = lines[valueIndex].trim()
                if (/^\d+$/.test(value)) {
                    creditsPassed = parseInt(value, 10)
                }
            }
        }
        
        if (line === "SGPA:" && i + 2 < endIndex) {
            const valueIndex = lines[i + 1].trim() === "" ? i + 2 : i + 1
            if (valueIndex < endIndex) {
                const value = lines[valueIndex].trim()
                // SGPA can be a number like "3.47" or "--" for N/A
                if (/^[\d.]+$/.test(value)) {
                    sgpa = parseFloat(value)
                }
            }
        }
    }

    return { courses, creditsAttended, creditsPassed, sgpa }
}

function extractVerticalFormattedCourses(lines: string[], coursesStart: number, endIndex: number, semesterStart: number) {
    // Handle vertical-format semesters where course data appears in vertical order
    // Example: Course code, then headers, then credit hours, grade, course name
    
    const courses: ParsedCourse[] = []
    let i = coursesStart
    
    while (i < endIndex) {
        const line = lines[i].trim()
        
        // Stop at semester summary
        if (line.includes("Semester Cr. Attended")) {
            break
        }
        
        // Look for course code (PREFIX on one line, NUMBER on next)
        if (/^[A-Z]{2,10}$/.test(line) && i + 1 < endIndex && /^\d{3}$/.test(lines[i + 1].trim())) {
            const coursePrefix = line
            const courseNumber = lines[i + 1].trim()
            const courseCode = `${coursePrefix} ${courseNumber}`
            i += 2
            
            // Skip headers (Course Name, Credit Hrs., Grade, etc.)
            while (i < endIndex) {
                const headerLine = lines[i].trim()
                if (headerLine === "Course Name" || headerLine === "Credit Hrs." || 
                    headerLine === "Credit Hrs" || headerLine === "Grade") {
                    i++
                } else {
                    break
                }
            }
            
            // Next values in order: credit hours, grade, course name
            let creditHours = 0
            let grade = ""
            let courseName = ""
            
            // Get credit hours
            if (i < endIndex && /^\d+$/.test(lines[i].trim())) {
                creditHours = parseInt(lines[i].trim(), 10)
                i++
            }
            
            // Get grade
            if (i < endIndex) {
                const gradeLine = lines[i].trim()
                if (/^[A-F][+-]?$/.test(gradeLine) || gradeLine === "I" || gradeLine === "IP" || 
                    gradeLine === "P" || gradeLine === "F" || gradeLine === "W") {
                    grade = gradeLine
                    i++
                }
            }
            
            // Get course name (one or more lines until we hit Status/Rep/next course)
            while (i < endIndex) {
                const nameLine = lines[i].trim()
                
                if (nameLine === "Status" || nameLine === "Rep." || nameLine === "Semester Cr. Attended" || 
                    nameLine === "" || /^[A-Z]{2,10}$/.test(nameLine)) {
                    break
                }
                
                if (nameLine) {
                    courseName += (courseName ? " " : "") + nameLine
                }
                
                i++
            }
            
            courses.push({
                courseCode,
                courseName: courseName.trim(),
                creditHours,
                grade: grade || "N/A",
                status: undefined,
                repeated: false,
                repeatCount: 0
            })
        } else {
            i++
        }
    }
    
    // Extract semester summary
    let creditsAttended = 0
    let creditsPassed = 0
    let sgpa = 0
    
    for (let j = semesterStart; j < endIndex; j++) {
        const line = lines[j].trim()
        
        if (line === "Semester Cr. Attended:" && j + 2 < endIndex) {
            const valueIndex = lines[j + 1].trim() === "" ? j + 2 : j + 1
            if (valueIndex < endIndex) {
                const value = lines[valueIndex].trim()
                if (/^\d+$/.test(value)) {
                    creditsAttended = parseInt(value, 10)
                }
            }
        }
        
        if (line === "Passed:" && j + 2 < endIndex && !lines[j - 1]?.includes("Cumulative")) {
            const valueIndex = lines[j + 1].trim() === "" ? j + 2 : j + 1
            if (valueIndex < endIndex) {
                const value = lines[valueIndex].trim()
                if (/^\d+$/.test(value)) {
                    creditsPassed = parseInt(value, 10)
                }
            }
        }
        
        if (line === "SGPA:" && j + 2 < endIndex) {
            const valueIndex = lines[j + 1].trim() === "" ? j + 2 : j + 1
            if (valueIndex < endIndex) {
                const value = lines[valueIndex].trim()
                if (/^[\d.]+$/.test(value)) {
                    sgpa = parseFloat(value)
                }
            }
        }
    }
    
    return { courses, creditsAttended, creditsPassed, sgpa }
}

function extractColumnarFormattedCourses(lines: string[], coursesStart: number, endIndex: number, semesterStart: number) {
    // Handle columnar-format semesters where grades appear in a separate column before course data
    // Example: Grade header, then A-, then course codes ACC 112...
    
    const courses: ParsedCourse[] = []
    const grades: string[] = []
    let i = coursesStart
    
    // First, collect all grades from the Grade column
    let foundGradeHeader = false
    while (i < endIndex) {
        const line = lines[i].trim()
        
        if (line === "Grade") {
            foundGradeHeader = true
            i++
            continue
        }
        
        // After finding Grade header, collect grade values until we hit course codes
        if (foundGradeHeader) {
            if (/^[A-F][+-]?$/.test(line) || line === "I" || line === "IP" || line === "P" || line === "F") {
                grades.push(line)
                i++
            } else if (/^[A-Z]{2,10}$/.test(line)) {
                // Hit first course code, stop collecting grades
                break
            } else {
                i++
            }
        } else {
            i++
        }
    }
    
    // Now parse courses normally
    while (i < endIndex) {
        const line = lines[i].trim()

        // Stop when we hit semester summary or status section
        if (line.includes("Semester Cr. Attended") || line === "Status" || line === "Rep.") {
            break
        }
        
        // Skip column headers
        if (line === "Course No." || line === "Course Name" || line === "Credit Hrs." || 
            line === "Grade" || line === "Status" || line === "Rep." || line === "Enrolled") {
            i++
            continue
        }

        // Look for course code pattern (normal format only in columnar)
        if (/^[A-Z]{2,10}$/.test(line) && line !== "Status" && line !== "Grade") {
            // Peek ahead - next line should be a course number
            if (i + 1 < endIndex && /^\d{3}/.test(lines[i + 1].trim())) {
                const courseData = extractCourseFromLines(lines, i, endIndex)
                if (courseData) {
                    courses.push(courseData.course)
                    i = courseData.nextIndex
                    continue
                }
            }
        }

        i++
    }
    
    // Assign pre-collected grades to courses
    for (let j = 0; j < Math.min(courses.length, grades.length); j++) {
        if (courses[j].grade === "N/A" || courses[j].grade === "") {
            courses[j].grade = grades[j]
        }
    }
    
    // Handle Status/Rep section for any remaining missing grades/statuses
    const statusSectionStart = i
    const statusValues: string[] = []
    
    for (let j = statusSectionStart; j < endIndex && j < statusSectionStart + 20; j++) {
        const line = lines[j].trim()
        
        if (line.includes("Semester Cr.")) {
            break
        }
        
        if (line === "Status" || line === "Rep." || line === "Grade" || line === "") {
            continue
        }
        
        if (line === "W" || /^[A-F][+-]?$/.test(line) || line === "IP" || line === "I" || line === "P" || line === "F") {
            statusValues.push(line)
        }
    }
    
    // Assign status values to courses without grades, in order
    let statusIndex = 0
    for (const course of courses) {
        if ((!course.grade || course.grade === "" || course.grade === "N/A") && statusIndex < statusValues.length) {
            const value = statusValues[statusIndex]
            
            if (value === "W") {
                course.status = "W"
                course.grade = "N/A"
            } else if (/^[A-F][+-]?$/.test(value) || value === "IP" || value === "I" || value === "P" || value === "F") {
                course.grade = value
            }
            
            statusIndex++
        }
    }
    
    // Extract semester summary
    let creditsAttended = 0
    let creditsPassed = 0
    let sgpa = 0
    
    for (let j = semesterStart; j < endIndex; j++) {
        const line = lines[j].trim()
        
        if (line === "Semester Cr. Attended:" && j + 2 < endIndex) {
            const valueIndex = lines[j + 1].trim() === "" ? j + 2 : j + 1
            if (valueIndex < endIndex) {
                const value = lines[valueIndex].trim()
                if (/^\d+$/.test(value)) {
                    creditsAttended = parseInt(value, 10)
                }
            }
        }
        
        if (line === "Passed:" && j + 2 < endIndex && !lines[j - 1]?.includes("Cumulative")) {
            const valueIndex = lines[j + 1].trim() === "" ? j + 2 : j + 1
            if (valueIndex < endIndex) {
                const value = lines[valueIndex].trim()
                if (/^\d+$/.test(value)) {
                    creditsPassed = parseInt(value, 10)
                }
            }
        }
        
        if (line === "SGPA:" && j + 2 < endIndex) {
            const valueIndex = lines[j + 1].trim() === "" ? j + 2 : j + 1
            if (valueIndex < endIndex) {
                const value = lines[valueIndex].trim()
                if (/^[\d.]+$/.test(value)) {
                    sgpa = parseFloat(value)
                }
            }
        }
    }
    
    return { courses, creditsAttended, creditsPassed, sgpa }
}

function extractTableFormattedCourses(lines: string[], coursesStart: number, endIndex: number, semesterStart: number) {
    // Handle table-format semesters where course codes appear first, then data columns
    // Example: ENGLRL 002, MATHS 001, then headers, then names, credits, grades in order
    
    const courseCodes: string[] = []
    const courses: ParsedCourse[] = []
    let i = coursesStart
    
    // First, collect all course codes
    while (i < endIndex) {
        const line = lines[i].trim()
        
        // Stop when we hit table headers
        if (line === "Credit Hrs." || line === "Credit Hrs" || line === "Grade") {
            break
        }
        
        // Compact format: "ENGLRL 002"
        const compactMatch = line.match(/^([A-Z]+)\s+(\d{3})$/)
        if (compactMatch) {
            courseCodes.push(`${compactMatch[1]} ${compactMatch[2]}`)
            i++
            // Skip stray digits
            while (i < endIndex && /^\d+$/.test(lines[i].trim()) && lines[i].trim().length <= 2) {
                i++
            }
            continue
        }
        
        // Normal format: PREFIX then NUMBER on next line
        if (/^[A-Z]{2,10}$/.test(line) && i + 1 < endIndex) {
            const nextLine = lines[i + 1].trim()
            if (/^\d{3}/.test(nextLine)) {
                courseCodes.push(`${line} ${nextLine}`)
                i += 2
                continue
            }
        }
        
        i++
    }
    
    // Now skip past headers
    while (i < endIndex && (lines[i].trim() === "Credit Hrs." || lines[i].trim() === "Credit Hrs" || 
                            lines[i].trim() === "Grade" || lines[i].trim() === "Status" || 
                            lines[i].trim() === "Rep." || lines[i].trim() === "")) {
        i++
    }
    
    // Now extract course data in order matching the course codes
    for (const courseCode of courseCodes) {
        if (i >= endIndex) break
        
        // Get course name (one or more lines until we hit a digit)
        let courseName = ""
        while (i < endIndex) {
            const line = lines[i].trim()
            
            // Skip column headers
            if (line === "Course Name" || line === "Credit Hrs." || line === "Credit Hrs" || 
                line === "Grade" || line === "Status" || line === "Rep.") {
                i++
                continue
            }
            
            // Stop if we hit credit hours (single digit 0-9)
            if (/^\d+$/.test(line) && line.length <= 2) {
                break
            }
            
            // Stop if we hit semester summary
            if (line.includes("Semester Cr. Attended")) {
                break
            }
            
            if (line) {
                courseName += (courseName ? " " : "") + line
            }
            
            i++
        }
        
        if (i >= endIndex) break
        
        // Get credit hours
        const creditLine = lines[i].trim()
        const creditHours = /^\d+$/.test(creditLine) ? parseInt(creditLine, 10) : 0
        i++
        
        // Skip empty lines
        while (i < endIndex && !lines[i].trim()) i++
        if (i >= endIndex) break
        
        // Get grade
        const gradeLine = lines[i].trim()
        let grade = ""
        if (/^[A-FW][+-]?$/.test(gradeLine) || gradeLine === "IP" || gradeLine === "I" || gradeLine === "P" || gradeLine === "F") {
            grade = gradeLine
            i++
        }
        
        // Skip empty lines for next course
        while (i < endIndex && !lines[i].trim()) i++
        
        courses.push({
            courseCode,
            courseName: courseName.trim(),
            creditHours,
            grade: grade || "N/A",
            status: undefined,
            repeated: false,
            repeatCount: 0
        })
    }
    
    // Extract semester summary
    let creditsAttended = 0
    let creditsPassed = 0
    let sgpa = 0
    
    for (let j = semesterStart; j < endIndex; j++) {
        const line = lines[j].trim()
        
        if (line === "Semester Cr. Attended:" && j + 2 < endIndex) {
            const valueIndex = lines[j + 1].trim() === "" ? j + 2 : j + 1
            if (valueIndex < endIndex) {
                const value = lines[valueIndex].trim()
                if (/^\d+$/.test(value)) {
                    creditsAttended = parseInt(value, 10)
                }
            }
        }
        
        if (line === "Passed:" && j + 2 < endIndex && !lines[j - 1]?.includes("Cumulative")) {
            const valueIndex = lines[j + 1].trim() === "" ? j + 2 : j + 1
            if (valueIndex < endIndex) {
                const value = lines[valueIndex].trim()
                if (/^\d+$/.test(value)) {
                    creditsPassed = parseInt(value, 10)
                }
            }
        }
        
        if (line === "SGPA:" && j + 2 < endIndex) {
            const valueIndex = lines[j + 1].trim() === "" ? j + 2 : j + 1
            if (valueIndex < endIndex) {
                const value = lines[valueIndex].trim()
                if (/^[\d.]+$/.test(value)) {
                    sgpa = parseFloat(value)
                }
            }
        }
    }
    
    return { courses, creditsAttended, creditsPassed, sgpa }
}

function extractCourseFromLines(lines: string[], startIndex: number, endIndex: number): { course: ParsedCourse; nextIndex: number } | null {
    // Course structure in PDF can be:
    // Case 1 - Compact: "ENGLRL 002" on one line
    // Case 2 - Normal: "ARAB" then "110" on separate lines
    
    let coursePrefix = ""
    let courseNumber = ""
    let i = startIndex
    
    const firstLine = lines[startIndex].trim()
    
    // Check if course code is on one line (e.g., "ENGLRL 002" or "MATHS 001")
    const compactMatch = firstLine.match(/^([A-Z]+)\s+(\d{3})$/)
    if (compactMatch) {
        coursePrefix = compactMatch[1]
        courseNumber = compactMatch[2]
        i++
        
        // Skip any stray single-digit numbers that might follow (like the "2" after "ENGLRL 002")
        while (i < endIndex && /^\d+$/.test(lines[i].trim()) && lines[i].trim().length <= 2) {
            i++
        }
    } else {
        // Normal multi-line format
        coursePrefix = firstLine
        i++
        
        // Skip empty lines
        while (i < endIndex && !lines[i].trim()) i++
        if (i >= endIndex) return null
        
        // Get course number
        courseNumber = lines[i].trim()
        if (!/^\d{3}/.test(courseNumber)) return null
        
        i++
    }
    
    while (i < endIndex && !lines[i].trim()) i++
    if (i >= endIndex) return null
    
    // Get course name (might span multiple lines until we hit a number)
    let courseName = ""
    while (i < endIndex) {
        const line = lines[i].trim()
        
        // Skip column headers
        if (line === "Course Name" || line === "Credit Hrs." || line === "Credit Hrs" || 
            line === "Grade" || line === "Status" || line === "Rep.") {
            i++
            continue
        }
        
        // Stop if we hit credit hours (a single digit line)
        if (/^\d+$/.test(line)) {
            break
        }
        
        // Stop if we hit another course code (normal format)
        if (/^[A-Z]{2,10}$/.test(line) && i + 1 < endIndex && /^\d{3}/.test(lines[i + 1])) {
            break
        }
        
        // Stop if we hit another course code (compact format)
        if (/^[A-Z]+\s+\d{3}$/.test(line)) {
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
    
    // Get grade (might not exist for withdrawn courses)
    let grade = ""
    let status = ""
    let repeated = false
    
    if (i < endIndex) {
        const gradeLine = lines[i].trim()
        
        // Check if this looks like a valid grade (added I for Incomplete)
        if (/^[A-FW][+-]?$/.test(gradeLine) || gradeLine === "IP" || gradeLine === "I" || gradeLine === "P" || gradeLine === "F") {
            grade = gradeLine
            i++
        } else if (gradeLine === "W") {
            // Withdrawn courses have W as status, not grade
            status = "W"
            grade = "N/A"
            i++
        } else if (/^[A-Z]{2,10}$/.test(gradeLine) && i + 1 < endIndex && /^\d{3}/.test(lines[i + 1].trim())) {
            // This looks like the next course code (PREFIX + NUMBER on next line)
            // Course has no grade - likely withdrawn
            grade = "" // Will be set later from Status section
            // Don't increment i - leave it for the next course
        } else if (/^[A-Z]+\s+\d{3}$/.test(gradeLine)) {
            // This looks like the next course code (compact format)
            // Course has no grade - likely withdrawn  
            grade = ""
            // Don't increment i
        } else if (gradeLine === "Status" || gradeLine === "Rep." || gradeLine === "Semester Cr. Attended") {
            // Hit the end of courses section
            grade = ""
            // Don't increment i
        } else {
            // Unknown line - might be grade or might be something else
            // Skip it cautiously
            i++
        }
    }
    
    // Check for additional status markers on the next line (if we haven't hit next course)
    if (i < endIndex && grade) { // Only check status if we have a grade
        const statusLine = lines[i].trim()
        if (statusLine === "W" && !status) {
            status = "W"
            i++
        } else if (statusLine === "Enrolled" || statusLine.includes("Rep")) {
            if (!status) status = statusLine
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
    // Find the last occurrence of cumulative data - values are on separate lines after labels
    let creditsAttended = 0
    let creditsPassed = 0
    let cgpa = 0
    let mcgpa = 0

    // Search backwards from end of file
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim()

        if (line === "Cumulative Cr. Attended:" && i + 3 < lines.length) {
            const valueIndex = lines[i + 1].trim() === "" ? i + 2 : i + 1
            if (valueIndex < lines.length) {
                const value = lines[valueIndex].trim()
                if (/^\d+$/.test(value)) {
                    creditsAttended = parseInt(value, 10)
                }
            }
        }
        
        if (line === "Passed:" && i + 3 < lines.length) {
            // Check if this is cumulative by looking backwards for "Cumulative" keyword
            let isCumulative = false
            for (let j = Math.max(0, i - 10); j < i; j++) {
                if (lines[j].includes("Cumulative")) {
                    isCumulative = true
                    break
                }
            }
            
            if (isCumulative && creditsPassed === 0) {
                const valueIndex = lines[i + 1].trim() === "" ? i + 2 : i + 1
                if (valueIndex < lines.length) {
                    const value = lines[valueIndex].trim()
                    if (/^\d+$/.test(value)) {
                        creditsPassed = parseInt(value, 10)
                    }
                }
            }
        }
        
        if (line === "CGPA:" && i + 3 < lines.length) {
            const valueIndex = lines[i + 1].trim() === "" ? i + 2 : i + 1
            if (valueIndex < lines.length) {
                const value = lines[valueIndex].trim()
                if (/^[\d.]+$/.test(value)) {
                    cgpa = parseFloat(value)
                }
            }
        }
        
        if (line === "MCGPA:" && i + 3 < lines.length) {
            const valueIndex = lines[i + 1].trim() === "" ? i + 2 : i + 1
            if (valueIndex < lines.length) {
                const value = lines[valueIndex].trim()
                // MCGPA can be a number or "--" for N/A
                if (/^[\d.]+$/.test(value)) {
                    mcgpa = parseFloat(value)
                }
            }
        }

        // If we found all data, we can stop
        if (cgpa > 0 && creditsAttended > 0 && creditsPassed > 0) {
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
