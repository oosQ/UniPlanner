
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Checking for scraped courses...')

    const scrapedCourses = ['IT699', 'ITAAI604', 'ITCY201']

    for (const code of scrapedCourses) {
        const course = await prisma.course.findUnique({
            where: { code },
            include: { sections: true, instructor: true }
        })

        if (course) {
            console.log(`✅ Found ${code}: ${course.title}`)
            console.log(`   Instructor: ${course.instructor?.name || 'None'}`)
            console.log(`   Sections: ${course.sections.length}`)
            course.sections.forEach(s => {
                console.log(`     - Sec ${s.section}: ${s.availableSeats} seats, Status: ${s.sectionStatus}`)
            })
        } else {
            console.log(`❌ ${code} NOT FOUND`)
        }
    }

    const totalCourses = await prisma.course.count()
    console.log(`Total courses in DB: ${totalCourses}`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
