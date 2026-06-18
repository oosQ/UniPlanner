export interface PlanCourse {
    code: string
    title: string
    credits: number
    type: string // "MR" | "CR" | "UR" | "MSR" | "ME" | "GSE"
    prerequisites: string
    isMajorGpa: boolean
    electiveListType?: string
}

export interface PlanSemester {
    semesterName: string // e.g. "Year 1 - Semester 1"
    courses: PlanCourse[]
}

export interface ParsedStudyPlan {
    degreeName: string
    college?: string
    totalCredits: number
    semesters: PlanSemester[]
    electives?: PlanCourse[]
}

// Regex to find course codes (e.g. ITCS 113, ITIS 4XX, BUS XXX, GSE XXX)
const CODE_REGEX = /\b[A-Z]{3,5}\s?(?:\d{3}|\dXX|XXX)\b/g
const CODE_PATTERN = /^[A-Z]{3,5}\s?(?:\d{3}|\dXX|XXX)$/

export function parseStudyPlan(rawText: string): ParsedStudyPlan {
    const cleanedText = cleanPlanText(rawText)
    const lines = cleanedText.split("\n").map(l => l.trim()).filter(l => l.length > 0)

    // 1. Extract Degree Name (usually the first line, e.g. "B.Sc. in Information Systems 2017")
    let degreeName = "University Study Plan"
    if (lines.length > 0) {
        const firstLine = lines[0]
        if (firstLine.includes("B.Sc.") || firstLine.toLowerCase().includes("bachelor") || firstLine.toLowerCase().includes("plan")) {
            degreeName = firstLine
        }
    }

    // Extract College Name
    let college = ""
    const collegeLine = lines.slice(0, 15).find(line => line.toLowerCase().includes("college of"))
    if (collegeLine) {
        college = collegeLine.trim()
    }

    // 2. Extract Total Credits (e.g., search for "Total Credit (CRD)" or similar)
    let totalCredits = 0
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("Total Credit") && i + 1 < lines.length) {
            const nextVal = lines[i + 1].trim()
            if (/^\d+$/.test(nextVal)) {
                totalCredits = parseInt(nextVal, 10)
                break
            }
        }
    }

    // 3. Extract Semester Blocks
    const semesterBlocks = extractSemesterBlocks(lines)
    const semesters: PlanSemester[] = []
    
    // Global set to track concrete course codes seen across semesters
    const globalSeenConcreteCodes = new Set<string>()

    for (const block of semesterBlocks) {
        const courses = parseSemesterCourses(block.lines, globalSeenConcreteCodes)
        semesters.push({
            semesterName: block.header,
            courses
        })
    }

    // If total credits wasn't found in text, calculate it from courses
    if (totalCredits === 0) {
        totalCredits = semesters.reduce((sum, sem) => {
            return sum + sem.courses.reduce((s, c) => s + c.credits, 0)
        }, 0)
    }

    // 4. Extract Elective Courses from leftover lines after semester blocks
    let stopIdx = -1
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line.includes("Major Elective Courses") || line.includes("List 1:") || line.includes("List1:")) {
            stopIdx = i
            break
        }
    }

    let electives: PlanCourse[] = []
    if (stopIdx !== -1) {
        const leftoverLines = lines.slice(stopIdx)
        
        interface Section {
            name: string
            startIndex: number
        }
        
        const sections: Section[] = []
        for (let i = 0; i < leftoverLines.length; i++) {
            const line = leftoverLines[i]
            if (line.includes("List 1:") || line.includes("List1:")) {
                sections.push({ name: "List 1: ITIS Concentration Major Elective", startIndex: i })
            } else if (line.includes("List 2:") || line.includes("List2:")) {
                sections.push({ name: "List 2: ITIS General Major Elective", startIndex: i })
            } else if (line.includes("List 3:") || line.includes("List3:")) {
                sections.push({ name: "List 3: Business Elective Courses", startIndex: i })
            } else if (line.includes("General Studies Elective Courses List") || line.includes("General Studies Elective")) {
                sections.push({ name: "General Studies Elective Courses List", startIndex: i })
            }
        }
        
        for (let i = 0; i < sections.length; i++) {
            const currentSec = sections[i]
            const nextSecIdx = i + 1 < sections.length ? sections[i+1].startIndex : leftoverLines.length
            const sectionLines = leftoverLines.slice(currentSec.startIndex, nextSecIdx)
            
            const sectionCourses = parseSemesterCourses(sectionLines, new Set<string>())
            for (const course of sectionCourses) {
                course.electiveListType = currentSec.name
                electives.push(course)
            }
        }
    }

    return {
        degreeName,
        college,
        totalCredits,
        semesters,
        electives
    }
}

function cleanPlanText(text: string): string {
    const lines = text.split("\n")
    const cleaned: string[] = []

    for (const line of lines) {
        const trimmed = line.trim()
        
        // Skip common headers/footers
        if (trimmed.match(/^Page \d+ of \d+$/)) continue
        if (trimmed.includes("Detailed Study Plan") && cleaned.length > 5) continue
        
        cleaned.push(line)
    }

    return cleaned.join("\n")
}

interface SemesterBlock {
    header: string
    lines: string[]
}

function extractSemesterBlocks(lines: string[]): SemesterBlock[] {
    const blocks: SemesterBlock[] = []
    const semesterHeaderRegex = /Year\s+(\d+)\s*-\s*Semester\s+(\d+)/i

    let currentBlock: SemesterBlock | null = null

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const match = line.match(semesterHeaderRegex)

        if (match) {
            if (currentBlock) {
                blocks.push(currentBlock)
            }
            currentBlock = {
                header: `Year ${match[1]} - Semester ${match[2]}`,
                lines: []
            }
        } else if (currentBlock) {
            // Stop collecting if we hit the Major Elective details section
            if (line.includes("Major Elective Courses") || line.includes("List 1:") || line.includes("List1:")) {
                blocks.push(currentBlock)
                currentBlock = null
            } else {
                currentBlock.lines.push(line)
            }
        }
    }

    if (currentBlock) {
        blocks.push(currentBlock)
    }

    return blocks
}

function parseSemesterCourses(blockLines: string[], globalSeenConcreteCodes: Set<string>): PlanCourse[] {
    const courses: PlanCourse[] = []
    const assignedCodes = new Set<string>()
    const prerequisiteCodes = new Set<string>()

    // Course types we expect
    const courseTypes = new Set(["MR", "CR", "UR", "MSR", "ME", "GSE"])

    // Step 1: Parse courses with standard row layout
    for (let i = 0; i < blockLines.length; i++) {
        const line = blockLines[i]

        if (courseTypes.has(line)) {
            // Check if we have numbers above it: CRD, PRAC, LEC
            if (i - 3 >= 0) {
                const crdStr = blockLines[i - 1]
                const pracStr = blockLines[i - 2]
                const lecStr = blockLines[i - 3]

                if (/^\d+$/.test(crdStr) && /^\d+$/.test(pracStr) && /^\d+$/.test(lecStr)) {
                    const credits = parseInt(crdStr, 10)
                    
                    // Scan upwards from i - 4 to extract title and potentially code
                    let titleParts: string[] = []
                    let code = "unknown"
                    
                    let k = i - 4
                    while (k >= 0) {
                        const prevLine = blockLines[k]
                        
                        // Stop if we hit a course code
                        if (CODE_PATTERN.test(prevLine)) {
                            code = prevLine
                            break
                        }
                        
                        // Stop if we hit previous Major GPA flag, semester header elements, or other dividers
                        if (prevLine === "Yes" || prevLine === "No" || prevLine.includes("Semester") || prevLine === "Course Code" || prevLine === "Course Title" || prevLine === "GPA" || prevLine === "requisite" || prevLine === "Pre") {
                            break
                        }
                        
                        titleParts.push(prevLine)
                        k--
                    }
                    
                    // Title parts are collected bottom-up, so reverse to get natural order
                    const title = titleParts.reverse().join(" ").trim()
                    
                    // Scan downwards from i + 1 to find prerequisite and Major GPA flag
                    let prereqParts: string[] = []
                    let isMajorGpa = false
                    
                    let m = i + 1
                    while (m < blockLines.length) {
                        const nextLine = blockLines[m]
                        
                        if (nextLine === "Yes" || nextLine === "No") {
                            isMajorGpa = nextLine === "Yes"
                            break
                        }
                        
                        // If we hit next course type, stop
                        if (courseTypes.has(nextLine)) {
                            break
                        }
                        
                        prereqParts.push(nextLine)
                        m++
                    }
                    
                    const prerequisites = prereqParts.join(" ").trim() || "------"
                    
                    // Track prerequisite codes
                    const codesInPrereq = prerequisites.match(CODE_REGEX) || []
                    codesInPrereq.forEach(c => prerequisiteCodes.add(c))

                    if (code !== "unknown") {
                        assignedCodes.add(code)
                        const cleanCode = code.replace(/\s+/g, "").toUpperCase()
                        const isPlaceholder = code.includes("XX") || code.includes("XXX") || title.toLowerCase().includes("elective")
                        if (!isPlaceholder) {
                            globalSeenConcreteCodes.add(cleanCode)
                        }
                    }

                    courses.push({
                        code,
                        title,
                        credits,
                        type: line,
                        prerequisites,
                        isMajorGpa
                    })
                }
            }
        }
    }

    // Step 2: Extract all course codes in this block to resolve 'unknown' codes
    const blockText = blockLines.join("\n")
    const allCodesInBlock = blockText.match(CODE_REGEX) || []
    const uniqueCodesInBlock = Array.from(new Set(allCodesInBlock))

    // Filter out codes that are assigned or already seen globally
    const unassignedCodes = uniqueCodesInBlock.filter(
        code => {
            const cleanC = code.replace(/\s+/g, "").toUpperCase()
            const isPlaceholder = code.includes("XX") || code.includes("XXX")
            if (isPlaceholder) {
                return !assignedCodes.has(code)
            }
            return !assignedCodes.has(code) && !globalSeenConcreteCodes.has(cleanC)
        }
    )

    // Resolve 'unknown' course codes in order of appearance
    let unassignedIdx = 0
    for (const course of courses) {
        if (course.code === "unknown" && unassignedIdx < unassignedCodes.length) {
            course.code = unassignedCodes[unassignedIdx]
            assignedCodes.add(unassignedCodes[unassignedIdx])
            const cleanC = course.code.replace(/\s+/g, "").toUpperCase()
            globalSeenConcreteCodes.add(cleanC)
            unassignedIdx++
        }
    }

    // Step 3: Handle leftover codes (e.g. Internship or other courses printed differently)
    const stopWords = new Set([
        "pre", "requisite", "yes", "no", "course code", "course title", "course hours", 
        "lec", "prac", "crd", "course type", "gpa", "major", "cumulative", 
        "passed", "attended", "training", "requirement", "credits", "pass 85", 
        "pass 85 credits", "pass 85 credits senior project"
    ])

    const leftoverCodes = unassignedCodes.slice(unassignedIdx)
    for (const code of leftoverCodes) {
        // Find where this code is in blockLines
        const lineIdx = blockLines.findIndex(l => l === code)
        if (lineIdx !== -1 && lineIdx + 1 < blockLines.length) {
            const title = blockLines[lineIdx + 1]
            
            // Skip if it's a stop word
            if (stopWords.has(title.toLowerCase().trim()) || stopWords.has(code.toLowerCase().trim())) {
                continue
            }

            const cleanC = code.replace(/\s+/g, "").toUpperCase()
            if (globalSeenConcreteCodes.has(cleanC)) {
                continue
            }

            // Search next few lines for credits
            let credits = 3
            for (let offset = 2; offset <= 8 && lineIdx + offset < blockLines.length; offset++) {
                const checkLine = blockLines[lineIdx + offset]
                if (/^\d+$/.test(checkLine) && (checkLine === "1" || checkLine === "3" || checkLine === "4" || checkLine === "2")) {
                    credits = parseInt(checkLine, 10)
                    break
                }
            }

            // Force Internship credits to 1
            if (code.includes("483") || title.toLowerCase().includes("internship")) {
                credits = 1
            }

            // Determine type
            let type = "MR"
            if (code.startsWith("ITIS")) type = "MR"
            else if (code.startsWith("ITCS") || code.startsWith("MATHS")) type = "CR"
            else if (code.startsWith("ARAB") || code.startsWith("HIST") || code.startsWith("ISLM") || code.startsWith("HRLC")) type = "UR"
            else type = "MSR"

            globalSeenConcreteCodes.add(cleanC)

            courses.push({
                code,
                title,
                credits,
                type,
                prerequisites: "------",
                isMajorGpa: true
            })
        }
    }

    // Clean up title strings and correct misassigned course codes
    courses.forEach(c => {
        c.title = c.title.replace(/Course Hours LEC PRAC CRD Course Type/g, "").trim()
        if (c.title.toLowerCase().includes("business elective") && c.code === "ITIS 213") {
            c.code = "BUS XXX"
        }
    })

    return courses
}
