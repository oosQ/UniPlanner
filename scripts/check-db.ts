import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const count = await prisma.course.count()
    console.log(`Total courses in DB: ${count}`)

    const colleges = await prisma.college.count()
    console.log(`Total colleges: ${colleges}`)

    const depts = await prisma.department.count()
    console.log(`Total departments: ${depts}`)
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
