"use server"

import * as cheerio from "cheerio"

export interface CourseSection {
    section: string
    instructor: string
    availableSeats: string
    examDate: string
    examTime: string
    examRoom: string
    days: string
    time: string
    location: string
    classType?: string
    status: string
}

export interface Course {
    code: string
    title: string
    prereqs: string
    sections: CourseSection[]
}

export async function checkWebsiteAvailability(): Promise<{ available: boolean; message?: string }> {
    try {
        const response = await fetch("https://ucs.uob.edu.bh/index.php", {
            method: "HEAD",
            signal: AbortSignal.timeout(8000) // 8 second timeout for availability check
        })

        if (!response.ok) {
            return {
                available: false,
                message: "UCS course system is currently unavailable. Please try again later."
            }
        }

        return { available: true }
    } catch (error) {
        return {
            available: false,
            message: "Unable to connect to UCS website. The service may be temporarily unavailable. Please check your internet connection and try again later."
        }
    }
}

export async function getDepartments(collegeId: string) {
    if (!collegeId) return []

    try {
        const response = await fetch(`https://ucs.uob.edu.bh/getdept.php?q=${collegeId}`, {
            signal: AbortSignal.timeout(10000) // 10 second timeout
        })

        if (!response.ok) {
            throw new Error(`UCS website returned status ${response.status}`)
        }

        const html = await response.text()
        const $ = cheerio.load(html)
        const departments: { value: string; label: string }[] = []

        $("option").each((_, element) => {
            const value = $(element).attr("value")?.trim()
            const label = $(element).text().trim()
            if (value && label && value !== "") {
                departments.push({ value, label })
            }
        })

        return departments
    } catch (error) {
        console.error('getDepartments error:', error)
        if (error instanceof Error) {
            if (error.name === 'TimeoutError') {
                throw new Error("Request timed out while connecting to UCS website. Please try again later.")
            }
            if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
                throw new Error(`Unable to connect to UCS website: ${error.message}. The service may be temporarily unavailable.`)
            }
            throw new Error(`UCS website error: ${error.message}`)
        }
        throw new Error("Unable to fetch departments from UCS website. Please check your connection and try again.")
    }
}

export async function searchCourses(formData: FormData) {
    try {
        // Construct body for POST request
        const body = new URLSearchParams()
        // Default Params
        body.append("year", formData.get("year") as string || "2025")
        body.append("sem", formData.get("sem") as string || "2")

        const type = formData.get("type") as string
        body.append("type", type)

        if (type === "CC") {
            body.append("code", formData.get("code") as string)
        } else {
            body.append("college", formData.get("college") as string)
            body.append("dept", formData.get("dept") as string)
        }

        const response = await fetch("https://ucs.uob.edu.bh/index.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
            signal: AbortSignal.timeout(15000) // 15 second timeout
        })

        if (!response.ok) {
            throw new Error(`UOB website returned status ${response.status}`)
        }

        const html = await response.text()
        const $ = cheerio.load(html)
        const courses: Course[] = []

        $("table.courseRowClass").each((_, table) => {
            const $table = $(table)
            const headerText = $table.find("thead th").text().trim() // "IT699 (M.SC. THESIS)"
            let code = ""
            let title = ""

            const codeSpan = $table.find("thead th span").first().text().trim()
            if (codeSpan) {
                code = codeSpan
                // Title is usually inside the parentheses
                const fullText = $table.find("thead th").text()
                const match = fullText.match(/\((.*?)\)/)
                if (match) title = match[1]
            }

            // 2. Extract Sections
            const sections: CourseSection[] = []

            // Each section is inside .secContainer within the tbody
            $table.find(".secContainer").each((_, container) => {
                const $sec = $(container)

                const section = $sec.find(".row").first().find("span").last().text().trim() // Section: 01
                const instructor = $sec.find("span:contains('Instructor:')").next().text().trim()
                const availableSeats = $sec.find(".noSeats").text().trim()
                const status = $sec.find("span:contains('Section Status:')").next().text().trim()
                const examRoom = $sec.find("span:contains('Exam Room:')").next().text().trim()
                const examDateFull = $table.find(".row:contains('Exam Date:')").find(".large-10").text().trim()
                const examTimeFull = $table.find(".row:contains('Exam Time:')").find(".large-10").text().trim()

                // Helper to extract text relative to a label within a context
                const getTextAfterLabel = (context: cheerio.Cheerio, label: string) => {
                    let el = context.find(`font:contains('${label}')`).first()
                    if (el.length > 0) {
                        return (el[0] as any).nextSibling?.nodeValue?.trim() || el.parent().text().replace(label, "").trim()
                    }
                    return context.find(`td:contains('${label}')`).first().text().replace(label, "").trim()
                }

                const daysList: string[] = []
                const timesList: string[] = []
                const locsList: string[] = []
                const typesList: string[] = []

                const $scheduleTables = $sec.nextUntil(".secContainer", "table.noMargin")

                $scheduleTables.each((_, tbl) => {
                    const $tbl = $(tbl)
                    const day = getTextAfterLabel($tbl, "Day:")
                    const time = getTextAfterLabel($tbl, "Time:")
                    const loc = getTextAfterLabel($tbl, "Location:")
                    const type = getTextAfterLabel($tbl, "Class Type:")

                    if (day) daysList.push(day)
                    if (time) timesList.push(time)
                    if (loc) locsList.push(loc)
                    if (type) typesList.push(type)
                })

                // Join them or just take unique ones
                const days = [...new Set(daysList)].join(" / ")
                const time = [...new Set(timesList)].join(" / ")
                const location = [...new Set(locsList)].join(" / ")
                const classType = [...new Set(typesList)].join(" / ")

                sections.push({
                    section,
                    instructor,
                    availableSeats,
                    examDate: examDateFull,
                    examTime: examTimeFull,
                    examRoom,
                    days,
                    time,
                    location,
                    classType,
                    status
                })
            })

            // Prereqs
            const prereqs = $table.find(".row:contains('Prereqs:')").find(".large-10").text().trim()

            if (code) {
                courses.push({
                    code,
                    title,
                    prereqs,
                    sections
                })
            }
        })

        return courses

    } catch (error) {
        console.error('searchCourses error:', error)
        if (error instanceof Error) {
            if (error.name === 'TimeoutError') {
                throw new Error("Request timed out while searching courses on UCS website. Please try again later.")
            }
            if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
                throw new Error(`Unable to connect to UCS website: ${error.message}. The service may be temporarily unavailable.`)
            }
            throw new Error(`UCS website error: ${error.message}`)
        }
        throw new Error("Unable to search courses on UCS website. Please check your connection and try again.")
    }
}
