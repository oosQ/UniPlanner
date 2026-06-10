const PLAN_DATA_KEY = "uniplanner_plan_data"
const TRANSCRIPT_DATA_KEY = "uniplanner_transcript_data"

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
}
