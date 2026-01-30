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

export async function getDepartments(collegeId: string) {
    if (!collegeId) return []

    try {
        const response = await fetch(`http://ucs.uob.edu.bh/getdept.php?q=${collegeId}`)
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
        console.error("Error fetching departments:", error)
        return []
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

        const response = await fetch("http://ucs.uob.edu.bh/index.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
        })

        const html = await response.text()
        const $ = cheerio.load(html)
        const courses: Course[] = []

        // Parse Results
        // Based on the HTML structure provided
        // Each course is in a table.courseRowClass, or we iterate through tables

        $("table.courseRowClass").each((_, table) => {
            const $table = $(table)

            // 1. Extract Header (Code + Title)
            // Header is in <thead> -> <th> -> spans
            // Structure: <span>CODE</span><span></span><span>(</span><span>TITLE</span><span>)</span>

            const headerText = $table.find("thead th").text().trim() // "IT699 (M.SC. THESIS)"

            // Regex to parse "CODE (TITLE)"
            // But checking the HTML provided: 
            // <span style="color:#900">IT699</span> ... (<span>M.SC. THESIS</span>)

            // Let's rely on text content for now and basic split
            // Or try to select specific spans if consistent

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

                // Instructor
                // Row 2 -> Col 1 -> span style green: Instructor -> sibling span
                // Actually easier to search by text "Instructor:"

                const instructor = $sec.find("span:contains('Instructor:')").next().text().trim()
                const availableSeats = $sec.find(".noSeats").text().trim()
                const status = $sec.find("span:contains('Section Status:')").next().text().trim()

                // Exam Room is in the same row
                const examRoom = $sec.find("span:contains('Exam Room:')").next().text().trim()

                // Exam Date from the parent row above secContainer? 
                // In HTML: <div class="row"><div ...>Exam Date:</div>...<div>DATE<br></div></div>
                // It is OUTSIDE .secContainer, usually shared for the course?
                // Wait, in provided HTML, Exam Date is inside the <tr> <td> colspan=2 structure, BEFORE .secContainer(s).
                // But if there are multiple sections, does it repeat?
                // The provided HTML shows one course row per course, containing multiple sections? NO.
                // The logical structure: Table -> TBody -> TR -> TD -> Rows (Prereqs, ExamDate) -> secContainer (Section 1) -> secContainer (Section 2)...

                const examDateFull = $table.find(".row:contains('Exam Date:')").find(".large-10").text().trim()
                // Example: "2026-05-13 - 17:30 - 20:30" or "0"

                // Helper to extract text relative to a label within a context
                const getTextAfterLabel = (context: cheerio.Cheerio, label: string) => {
                    let el = context.find(`font:contains('${label}')`).first()
                    if (el.length > 0) {
                        return el[0].nextSibling?.nodeValue?.trim() || el.parent().text().replace(label, "").trim()
                    }
                    return context.find(`td:contains('${label}')`).first().text().replace(label, "").trim()
                }

                // Schedule Info is in table.noMargin siblings AFTER .secContainer
                // There can be multiple tables (e.g. one for each day)
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
                    examTime: "",
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
        console.error("Search error:", error)
        return []
    }
}
