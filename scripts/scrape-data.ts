
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as cheerio from 'cheerio'

const prisma = new PrismaClient()

async function main() {
    try {
        // 1. Scrape Instructor Details
        console.log('Processing Instructor Details...')
        const instructorPath = path.join(process.cwd(), 'scraper', 'instructor_details.html')
        if (fs.existsSync(instructorPath)) {
            const instructorHtml = fs.readFileSync(instructorPath, 'utf-8')
            await parseInstructor(instructorHtml)
        } else {
            console.warn('scraper/instructor_details.html not found, skipping.')
        }

        // 2. Scrape Course Details
        console.log('Processing Course Details...')
        const coursePath = path.join(process.cwd(), 'scraper', 'course_details.html')
        if (fs.existsSync(coursePath)) {
            const courseHtml = fs.readFileSync(coursePath, 'utf-8')
            await parseCourseDetails(courseHtml)
        } else {
            console.warn('scraper/course_details.html not found, skipping.')
        }

    } catch (error) {
        console.error('Error in scrape-data script:', error)
    } finally {
        await prisma.$disconnect()
    }
}

async function parseInstructor(html: string) {
    const $ = cheerio.load(html)

    // 1. Name
    // Try multiple selectors
    let name = $('.fusion-title-3 h3.title-heading-left').text().trim()
    if (!name) name = $('h3.title-heading-left').first().text().trim()

    // Clean name (remove "Dr." maybe? keeping it for now as it matches UOB style)
    console.log(`Found Instructor Name: ${name}`)

    // 2. Photo
    let photoUrl = $('.fusion-title-2 img').attr('src')
    if (!photoUrl) photoUrl = $('.fusion-title-6 img').attr('src')

    // 3. Office & Contact
    // The contact info is often in .fusion-title-5 h3
    const contactBlock = $('.fusion-title-5 h3').html()
    let office = null
    let email = null

    if (contactBlock) {
        // Office Regex (e.g. S40-1075)
        const officeMatch = contactBlock.match(/S\d+-\d+/);
        if (officeMatch) office = officeMatch[0];

        // Email Regex
        const emailMatch = contactBlock.match(/mailto:([^"]+)/);
        if (emailMatch) email = emailMatch[1];
    }

    // 4. College Subdomain (from URL usually, but here fixed or parsed from links)
    // We can try to guess from the "Home" link
    const homeLink = $('.fusion-breadcrumbs a[href*=".uob.edu.bh"]').first().attr('href')
    let collegeSubdomain = null
    if (homeLink) {
        const match = homeLink.match(/https?:\/\/([^\.]+)\.uob\.edu\.bh/)
        if (match) collegeSubdomain = match[1]
    }

    if (name) {
        // Upsert logic
        // We try to find an existing instructor by name.
        const existing = await prisma.instructor.findFirst({ where: { name } })

        if (existing) {
            console.log(`Updating existing instructor: ${name}`)
            await prisma.instructor.update({
                where: { id: existing.id },
                data: {
                    photoUrl,
                    office,
                    email: email || existing.email // Prefer scraped email
                }
            })
        } else {
            console.log(`Creating new instructor: ${name}`)
            await prisma.instructor.create({
                data: {
                    name,
                    photoUrl,
                    office,
                    email
                }
            })
        }
    }
}

async function parseCourseDetails(html: string) {
    const $ = cheerio.load(html)
    const rows = $('.courseRowClass')

    console.log(`Found ${rows.length} course rows.`)

    // Fetch default college/dept for new courses (fallback)
    const defaultDept = await prisma.department.findFirst()
    const defaultCollege = await prisma.college.findFirst()

    if (!defaultDept || !defaultCollege) {
        console.error("No default department or college found. Please seed the DB first.")
        return
    }

    for (let i = 0; i < rows.length; i++) {
        const rowElem = $(rows[i])

        // --- Course Code & Title ---
        const header = rowElem.find('thead th.left')
        const fullTitle = header.text().trim() // e.g. "IT699 (M.SC. THESIS)"

        // Extract code: "IT699" from "IT699 (Title)"
        // The HTML structure is: <span style="color:#900">IT699</span><span></span><span> (</span><span>M.SC. THESIS</span><span>) </span>
        const code = header.find('span').eq(0).text().trim()

        // Extract title: "M.SC. THESIS"
        // Try to get text inside parentheses or just join the rest
        let title = "Unknown Title"
        const titleMatch = fullTitle.match(/\((.*?)\)/)
        if (titleMatch) {
            title = titleMatch[1].trim()
        }

        if (!code) continue;

        // --- Section Details ---
        const secContainer = rowElem.find('.secContainer')
        const sectionNum = secContainer.find('div.large-12:contains("Section:") span').eq(1).text().trim() || "01"

        // Seats
        const seatsText = secContainer.find('.noSeats').text().trim()
        const availableSeats = parseInt(seatsText) || 0

        // Exam Room
        const examRoom = secContainer.find('span:contains("Exam Room:")').next('span').text().trim()

        // Status
        const sectionStatus = secContainer.find('span:contains("Section Status:")').next('span').text().trim()

        // Class Type
        const classType = rowElem.find('.section_time_days font:contains("Class Type:")').parent().text().replace('Class Type:', '').trim()

        // Exam Date
        const examDateText = rowElem.find('.row').filter((_, el) => $(el).text().includes('Exam Date:')).find('.large-10').text().trim()

        // Synthetic CRN since strictly unique and not always visible
        const crn = `${code}-${sectionNum}`

        console.log(`Processing ${code} - ${title}`)

        // --- Upsert Course ---
        const course = await prisma.course.upsert({
            where: { code },
            update: {
                // Determine if we should update core details or just keep them
                title: title
            },
            create: {
                code,
                title,
                credits: 3, // Default, as not parsed yet
                description: "Imported from Schedule",
                departmentId: defaultDept.id,
                collegeId: defaultCollege.id
            }
        })

        // --- Upsert Section ---
        await prisma.courseSection.upsert({
            where: { crn },
            update: {
                availableSeats,
                examRoom,
                sectionStatus,
                classType,
                examDate: examDateText,
                section: sectionNum,
                courseId: course.id
            },
            create: {
                crn,
                section: sectionNum,
                courseId: course.id,
                semester: "Second", // Default based on form selection in HTML
                year: "2024-2025",
                availableSeats,
                examRoom,
                sectionStatus,
                classType,
                examDate: examDateText
            }
        })
        console.log(`   > Upserted Section ${sectionNum}`)
    }
}

main()
