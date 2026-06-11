export interface ScheduledSection {
    courseCode: string
    courseTitle: string
    section: string
    instructor: string
    days: string
    time: string
    examDate: string
    examTime?: string
    examRoom: string
    location: string
    classType?: string
}

export interface PickedSection extends ScheduledSection {
    year?: string
    semester?: string
    credits?: number
}

export interface SavedSchedule {
    id: string
    name: string
    sections: ScheduledSection[]
}

const PLAN_DATA_KEY = "uniplanner_plan_data"
const TRANSCRIPT_DATA_KEY = "uniplanner_transcript_data"
const SCHEDULES_KEY = "uniplanner_saved_schedules"
const PICKED_SECTIONS_KEY = "uniplanner_picked_sections"

function safeRead<T>(key: string): T | null {
    if (typeof window === "undefined") return null

    try {
        const rawValue = localStorage.getItem(key)
        return rawValue ? JSON.parse(rawValue) as T : null
    } catch (error) {
        console.error(`Failed to read localStorage key: ${key}`, error)
        return null
    }
}

function safeWrite<T>(key: string, value: T | null) {
    if (typeof window === "undefined") return

    try {
        if (value === null) {
            localStorage.removeItem(key)
            return
        }

        localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
        console.error(`Failed to write localStorage key: ${key}`, error)
    }
}

export function readStoredPlan<T>() {
    return safeRead<T>(PLAN_DATA_KEY)
}

export function writeStoredPlan<T>(value: T | null) {
    safeWrite(PLAN_DATA_KEY, value)
}

export function readStoredTranscript<T>() {
    return safeRead<T>(TRANSCRIPT_DATA_KEY)
}

export function writeStoredTranscript<T>(value: T | null) {
    safeWrite(TRANSCRIPT_DATA_KEY, value)
}

export function clearStoredAcademicData() {
    safeWrite(PLAN_DATA_KEY, null)
    safeWrite(TRANSCRIPT_DATA_KEY, null)
    safeWrite(SCHEDULES_KEY, null)
}

export function readStoredSchedules(): Record<string, SavedSchedule> {
    const schedules = safeRead<Record<string, SavedSchedule>>(SCHEDULES_KEY)
    if (schedules) return schedules

    // Return default empty schedules
    return {
        "schedule-1": { id: "schedule-1", name: "Schedule 1", sections: [] },
        "schedule-2": { id: "schedule-2", name: "Schedule 2", sections: [] },
        "schedule-3": { id: "schedule-3", name: "Schedule 3", sections: [] }
    }
}

export function writeStoredSchedules(schedules: Record<string, SavedSchedule>) {
    safeWrite(SCHEDULES_KEY, schedules)
}

export function addStoredSchedule(): SavedSchedule {
    const schedules = readStoredSchedules()
    const nextNumber = Object.keys(schedules)
        .map(id => {
            const match = id.match(/^schedule-(\d+)$/)
            return match ? parseInt(match[1], 10) : 0
        })
        .reduce((max, value) => Math.max(max, value), 0) + 1

    const schedule = {
        id: `schedule-${nextNumber}`,
        name: `Schedule ${nextNumber}`,
        sections: []
    }

    schedules[schedule.id] = schedule
    writeStoredSchedules(schedules)
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("storage"))
    }
    return schedule
}

export function deleteStoredSchedule(scheduleId: string): boolean {
    const schedules = readStoredSchedules()
    if (!schedules[scheduleId]) return false
    if (Object.keys(schedules).length <= 1) return false

    delete schedules[scheduleId]
    writeStoredSchedules(schedules)
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("storage"))
    }
    return true
}

export function readPickedSections(): PickedSection[] {
    return safeRead<PickedSection[]>(PICKED_SECTIONS_KEY) || []
}

export function writePickedSections(sections: PickedSection[]) {
    safeWrite(PICKED_SECTIONS_KEY, sections)
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("storage"))
    }
}

export function addPickedSection(section: PickedSection): { added: boolean } {
    const sections = readPickedSections()
    const cleanCode = (c: string) => c.replace(/\s+/g, "").toUpperCase()
    const exists = sections.some(existing =>
        cleanCode(existing.courseCode) === cleanCode(section.courseCode) &&
        existing.section === section.section &&
        existing.days === section.days &&
        existing.time === section.time
    )

    if (exists) return { added: false }

    writePickedSections([...sections, section])
    return { added: true }
}

export function removePickedSection(courseCode: string, section: string, time: string): boolean {
    const sections = readPickedSections()
    const cleanCode = (c: string) => c.replace(/\s+/g, "").toUpperCase()
    const targetCode = cleanCode(courseCode)
    const nextSections = sections.filter(existing =>
        !(cleanCode(existing.courseCode) === targetCode && existing.section === section && existing.time === time)
    )

    if (nextSections.length === sections.length) return false
    writePickedSections(nextSections)
    return true
}

export function clearPickedSections() {
    writePickedSections([])
}

export function addSectionToSchedule(scheduleId: string, section: ScheduledSection): { success: boolean; replaced: boolean } {
    const schedules = readStoredSchedules()
    const schedule = schedules[scheduleId]
    if (!schedule) return { success: false, replaced: false }

    const cleanCode = (c: string) => c.replace(/\s+/g, "").toUpperCase()
    const cleanSectionCode = cleanCode(section.courseCode)

    // Check if course already exists in schedule
    const existingIndex = schedule.sections.findIndex(s => cleanCode(s.courseCode) === cleanSectionCode)
    let replaced = false

    if (existingIndex > -1) {
        schedule.sections[existingIndex] = section
        replaced = true
    } else {
        schedule.sections.push(section)
    }

    schedules[scheduleId] = schedule
    writeStoredSchedules(schedules)
    
    // Dispatch custom event to notify other parts of the app
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("storage"))
    }
    
    return { success: true, replaced }
}

export function removeSectionFromSchedule(scheduleId: string, courseCode: string): boolean {
    const schedules = readStoredSchedules()
    const schedule = schedules[scheduleId]
    if (!schedule) return false

    const cleanCode = (c: string) => c.replace(/\s+/g, "").toUpperCase()
    const cleanTarget = cleanCode(courseCode)

    const initialLength = schedule.sections.length
    schedule.sections = schedule.sections.filter(s => cleanCode(s.courseCode) !== cleanTarget)

    if (schedule.sections.length !== initialLength) {
        schedules[scheduleId] = schedule
        writeStoredSchedules(schedules)
        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("storage"))
        }
        return true
    }
    return false
}

export function clearSchedule(scheduleId: string): boolean {
    const schedules = readStoredSchedules()
    const schedule = schedules[scheduleId]
    if (!schedule) return false

    schedule.sections = []
    schedules[scheduleId] = schedule
    writeStoredSchedules(schedules)
    
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("storage"))
    }
    return true
}
