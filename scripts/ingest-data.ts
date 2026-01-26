import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
    const dataPath = path.join(process.cwd(), 'data', 'dummy-courses.json')

    if (!fs.existsSync(dataPath)) {
        console.error('Data file not found. Run "npm run db:generate-data" first.')
        return
    }

    const rawData = fs.readFileSync(dataPath, 'utf-8')
    const { colleges, departments, courses } = JSON.parse(rawData)

    console.log('Starting ingestion...')

    // 1. Colleges
    for (const col of colleges) {
        await prisma.college.upsert({
            where: { id: col.id },
            update: { name: col.name },
            create: { id: col.id, name: col.name }
        })
    }
    console.log(`Processed ${colleges.length} colleges.`)

    // 2. Departments
    for (const dept of departments) {
        await prisma.department.upsert({
            where: { id: dept.id },
            update: { name: dept.name, collegeId: dept.collegeId },
            create: { id: dept.id, name: dept.name, collegeId: dept.collegeId }
        })
    }
    console.log(`Processed ${departments.length} departments.`)

    // 3. Courses & Instructors
    let courseCount = 0
    for (const course of courses) {
        // Ensure instructor exists
        let instructorId: string | undefined
        if (course.instructorName) {
            // Simple name-based upsert for now (not ideal for real world but good for dummy data)
            const instructor = await prisma.instructor.findFirst({ where: { name: course.instructorName } })
            if (instructor) {
                instructorId = instructor.id
            } else {
                const newInst = await prisma.instructor.create({ data: { name: course.instructorName } })
                instructorId = newInst.id
            }
        }

        // Upsert Course
        const dbCourse = await prisma.course.upsert({
            where: { code: course.code },
            update: {
                title: course.title,
                credits: course.credits,
                description: course.description,
                departmentId: course.departmentId,
                collegeId: course.collegeId,
                instructorId: instructorId
            },
            create: {
                code: course.code,
                title: course.title,
                credits: course.credits,
                description: course.description,
                departmentId: course.departmentId,
                collegeId: course.collegeId,
                instructorId: instructorId
            }
        })

        // Upsert Sections
        if (course.sections) {
            for (const section of course.sections) {
                let secInstId = instructorId
                if (section.instructorName && section.instructorName !== course.instructorName) {
                    const secInst = await prisma.instructor.findFirst({ where: { name: section.instructorName } })
                    if (secInst) {
                        secInstId = secInst.id
                    } else {
                        const newInst = await prisma.instructor.create({ data: { name: section.instructorName } })
                        secInstId = newInst.id
                    }
                }

                // Using upsert on CRN is risky if CRNs change semester to semester, 
                // but for this milestone assume CRN is unique identifier for simplicity
                await prisma.courseSection.upsert({
                    where: { crn: section.crn },
                    update: {
                        section: section.section,
                        semester: section.semester,
                        year: section.year,
                        days: section.days,
                        time: section.time,
                        examDate: section.examDate,
                        instructorId: secInstId,
                        courseId: dbCourse.id
                    },
                    create: {
                        crn: section.crn,
                        section: section.section,
                        semester: section.semester,
                        year: section.year,
                        days: section.days,
                        time: section.time,
                        examDate: section.examDate,
                        instructorId: secInstId,
                        courseId: dbCourse.id
                    }
                })
            }
        }

        courseCount++
    }

    console.log(`Ingested ${courseCount} courses.`)
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
