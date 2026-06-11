import { ScheduledSection } from "./storage"

export interface TimeSlot {
    day: number // 0: Sunday, 1: Monday, 2: Tuesday, 3: Wednesday, 4: Thursday, 5: Friday, 6: Saturday
    start: number // minutes from midnight
    end: number // minutes from midnight
}

export interface GenerationPreferences {
    days: "MW" | "UTH" | "ANY"
    time: "MORNING" | "AFTERNOON" | "ANY"
    excludeClosed: boolean
    avoidExamClashes: boolean
}

export interface GeneratedScheduleOption {
    id: string
    sections: ScheduledSection[]
    score: number // 0 to 100
    examClashesCount: number
    details: {
        daysMatchPercent: number
        timeMatchPercent: number
        totalCredits: number
        hasClosedSection: boolean
    }
}

/**
 * Parses UOB days string to day indices.
 * e.g. "U / T / H" -> [0, 2, 4], "MW" -> [1, 3]
 */
export function parseDays(daysStr: string): number[] {
    const clean = daysStr.toUpperCase().replace(/\s+/g, "")
    
    // Check if it's separated by slash or comma
    if (clean.includes("/") || clean.includes(",")) {
        const parts = clean.split(/[/,]/)
        const daysSet = new Set<number>()
        for (const part of parts) {
            if (part.includes("SUN") || part === "U") daysSet.add(0)
            else if (part.includes("MON") || part === "M") daysSet.add(1)
            else if (part.includes("TUE") || part === "T") daysSet.add(2)
            else if (part.includes("WED") || part === "W") daysSet.add(3)
            else if (part.includes("THU") || part === "H") daysSet.add(4)
            else if (part.includes("FRI") || part === "F") daysSet.add(5)
            else if (part.includes("SAT") || part === "S") daysSet.add(6)
        }
        return Array.from(daysSet)
    }

    const days: number[] = []
    if (clean.includes("U")) days.push(0)
    if (clean.includes("M")) days.push(1)
    if (clean.includes("T")) days.push(2)
    if (clean.includes("W")) days.push(3)
    if (clean.includes("H")) days.push(4)
    if (clean.includes("F")) days.push(5)
    if (clean.includes("S")) days.push(6)
    
    return days
}

/**
 * Parses a time string (e.g. "08:00 - 08:50") to start and end minutes from midnight.
 */
export function parseTimeRange(rangeStr: string): { start: number; end: number } | null {
    const parts = rangeStr.split("-").map(p => p.trim())
    if (parts.length !== 2) return null

    const parseTimeToMinutes = (t: string) => {
        const [hStr, mStr] = t.split(":")
        const h = parseInt(hStr, 10)
        const m = parseInt(mStr, 10)
        if (isNaN(h) || isNaN(m)) return 0
        return h * 60 + m
    }

    return {
        start: parseTimeToMinutes(parts[0]),
        end: parseTimeToMinutes(parts[1])
    }
}

/**
 * Parses a section's schedule days and times into time slots.
 * Handles zipped times (e.g. days "U / T / H" and times "08:00 - 08:50 / 08:00 - 08:50 / 08:00 - 08:50")
 * and cross-multiplied times (e.g. days "MW" and time "08:00 - 09:15")
 */
export function parseSectionSchedule(daysStr: string, timeStr: string): TimeSlot[] {
    if (!daysStr || !timeStr || daysStr === "TBA" || timeStr === "TBA") return []

    const dayParts = daysStr.split("/").map(d => d.trim()).filter(Boolean)
    const timeParts = timeStr.split("/").map(t => t.trim()).filter(Boolean)

    const slots: TimeSlot[] = []

    // Zipped format: equal number of segments
    if (dayParts.length === timeParts.length && dayParts.length > 1) {
        for (let i = 0; i < dayParts.length; i++) {
            const days = parseDays(dayParts[i])
            const range = parseTimeRange(timeParts[i])
            if (range) {
                for (const d of days) {
                    slots.push({ day: d, start: range.start, end: range.end })
                }
            }
        }
    } else {
        // Cross product: apply all time ranges to all days
        const allDays = parseDays(daysStr)
        for (const tStr of timeParts) {
            const range = parseTimeRange(tStr)
            if (range) {
                for (const d of allDays) {
                    slots.push({ day: d, start: range.start, end: range.end })
                }
            }
        }
    }

    return slots
}

/**
 * Checks if two sections have overlapping class times.
 */
export function checkTimeClash(sectionA: ScheduledSection, sectionB: ScheduledSection): boolean {
    const slotsA = parseSectionSchedule(sectionA.days, sectionA.time)
    const slotsB = parseSectionSchedule(sectionB.days, sectionB.time)

    for (const slotA of slotsA) {
        for (const slotB of slotsB) {
            if (slotA.day === slotB.day) {
                // Overlap: startA < endB && startB < endA
                if (slotA.start < slotB.end && slotB.start < slotA.end) {
                    return true
                }
            }
        }
    }
    return false
}

/**
 * Checks if two sections have overlapping final exam dates/times.
 */
export function checkExamClash(sectionA: ScheduledSection, sectionB: ScheduledSection): boolean {
    const examA = sectionA.examDate?.trim().toUpperCase() || ""
    const examB = sectionB.examDate?.trim().toUpperCase() || ""

    if (!examA || examA === "TBA" || examA.includes("ANNOUNCED") || examA === "------") return false
    if (!examB || examB === "TBA" || examB.includes("ANNOUNCED") || examB === "------") return false

    return examA === examB
}

interface CourseInput {
    code: string
    title: string
    credits: number
    sections: {
        section: string
        instructor: string
        days: string
        time: string
        examDate: string
        examRoom: string
        location: string
        availableSeats: string
        status: string
        classType?: string
    }[]
}

/**
 * Generates all valid (time-clash-free) schedule combinations based on preferences.
 */
export function generateScheduleOptions(
    courses: CourseInput[],
    preferences: GenerationPreferences
): GeneratedScheduleOption[] {
    // 1. Filter out courses with no sections
    const coursesWithSections = courses.filter(c => c.sections && c.sections.length > 0)
    if (coursesWithSections.length === 0) return []

    // 2. Cartesian product helper
    const combinations: ScheduledSection[][] = []
    
    function recurse(courseIndex: number, currentSet: ScheduledSection[]) {
        if (courseIndex === coursesWithSections.length) {
            combinations.push([...currentSet])
            return
        }

        const course = coursesWithSections[courseIndex]
        for (const sec of course.sections) {
            const scheduledSec: ScheduledSection = {
                courseCode: course.code,
                courseTitle: course.title,
                section: sec.section,
                instructor: sec.instructor,
                days: sec.days,
                time: sec.time,
                examDate: sec.examDate,
                examRoom: sec.examRoom,
                location: sec.location,
                classType: sec.classType
            }

            // Check if adding this section introduces a time clash within the current combination
            let hasClash = false
            for (const existing of currentSet) {
                if (checkTimeClash(scheduledSec, existing)) {
                    hasClash = true
                    break
                }
            }

            if (!hasClash) {
                recurse(courseIndex + 1, [...currentSet, scheduledSec])
            }
        }
    }

    // Start cartesian generation
    recurse(0, [])

    // 3. Process, score, and filter options
    const options: GeneratedScheduleOption[] = []

    for (let idx = 0; idx < combinations.length; idx++) {
        const set = combinations[idx]

        // Check for exam clashes
        let examClashesCount = 0
        for (let i = 0; i < set.length; i++) {
            for (let j = i + 1; j < set.length; j++) {
                if (checkExamClash(set[i], set[j])) {
                    examClashesCount++
                }
            }
        }

        // Avoid Exam Clashes preference check
        if (preferences.avoidExamClashes && examClashesCount > 0) {
            continue // Skip this schedule
        }

        // Check if closed sections are present
        let hasClosedSection = false
        for (const sec of set) {
            const course = coursesWithSections.find(c => c.code === sec.courseCode)
            const origSec = course?.sections.find(s => s.section === sec.section)
            const isClosed = origSec?.status?.toUpperCase().includes("CLOSED") || parseInt(origSec?.availableSeats || "0") === 0
            if (isClosed) {
                hasClosedSection = true
            }
        }

        // Exclude closed sections preference check
        if (preferences.excludeClosed && hasClosedSection) {
            continue // Skip this schedule
        }

        // Score this option based on preferences
        let daysMatchCount = 0
        let totalSlots = 0
        let timeMatchCount = 0

        for (const sec of set) {
            const slots = parseSectionSchedule(sec.days, sec.time)
            totalSlots += slots.length

            for (const slot of slots) {
                // Days check
                if (preferences.days === "MW") {
                    if (slot.day === 1 || slot.day === 3) daysMatchCount++
                } else if (preferences.days === "UTH") {
                    if (slot.day === 0 || slot.day === 2 || slot.day === 4) daysMatchCount++
                }

                // Time check
                const startHour = slot.start / 60
                if (preferences.time === "MORNING") {
                    // Morning classes: start before 12:00 PM
                    if (startHour < 12) timeMatchCount++
                } else if (preferences.time === "AFTERNOON") {
                    // Afternoon classes: start at or after 12:00 PM
                    if (startHour >= 12) timeMatchCount++
                }
            }
        }

        const daysMatchPercent = preferences.days === "ANY" || totalSlots === 0 
            ? 100 
            : Math.round((daysMatchCount / totalSlots) * 100)

        const timeMatchPercent = preferences.time === "ANY" || totalSlots === 0 
            ? 100 
            : Math.round((timeMatchCount / totalSlots) * 100)

        // Final score: average of matches
        const score = Math.round((daysMatchPercent + timeMatchPercent) / 2)

        const totalCredits = coursesWithSections.reduce((acc, c) => acc + c.credits, 0)

        options.push({
            id: `opt-${idx}`,
            sections: set,
            score,
            examClashesCount,
            details: {
                daysMatchPercent,
                timeMatchPercent,
                totalCredits,
                hasClosedSection
            }
        })
    }

    // Sort by score descending (highest matching first), then by fewer exam clashes, then by open status
    return options.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score
        if (a.examClashesCount !== b.examClashesCount) return a.examClashesCount - b.examClashesCount
        if (a.details.hasClosedSection !== b.details.hasClosedSection) {
            return a.details.hasClosedSection ? 1 : -1
        }
        return 0
    })
}
