const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding...')

    // 1. Colleges
    const colIT = await prisma.college.create({
        data: { id: 'IT', name: 'College of Information Technology' }
    })
    const colEng = await prisma.college.create({
        data: { id: 'ENG', name: 'College of Engineering' }
    })
    const colBus = await prisma.college.create({
        data: { id: 'BUS', name: 'College of Business Administration' }
    })

    // 2. Departments
    const deptCS = await prisma.department.create({
        data: { id: 'CS', name: 'Computer Science', collegeId: colIT.id }
    })
    const deptIS = await prisma.department.create({
        data: { id: 'IS', name: 'Information Systems', collegeId: colIT.id }
    })
    const deptCE = await prisma.department.create({
        data: { id: 'CE', name: 'Computer Engineering', collegeId: colIT.id }
    })
    const deptMech = await prisma.department.create({
        data: { id: 'MECH', name: 'Mechanical Engineering', collegeId: colEng.id }
    })
    const deptCivil = await prisma.department.create({
        data: { id: 'CIVIL', name: 'Civil Engineering', collegeId: colEng.id }
    })
    const deptAcc = await prisma.department.create({
        data: { id: 'ACC', name: 'Accounting', collegeId: colBus.id }
    })

    // 3. Instructors
    const instSmith = await prisma.instructor.create({
        data: { name: 'Dr. A. Smith' }
    })
    const instJones = await prisma.instructor.create({
        data: { name: 'Dr. B. Jones' }
    })

    // 4. Courses
    await prisma.course.create({
        data: {
            code: 'CSC 103',
            title: 'Computer Programming I',
            credits: 3,
            description: 'Introduction to problem solving and programming...',
            departmentId: deptCS.id,
            collegeId: colIT.id,
            instructorId: instSmith.id,
            sections: {
                create: [
                    {
                        crn: '10001', section: '01', semester: 'First', year: '2024-2025',
                        days: 'UTH', time: '08:00-08:50', examDate: '2024-06-15 08:30',
                        instructorId: instSmith.id
                    },
                    {
                        crn: '10002', section: '02', semester: 'First', year: '2024-2025',
                        days: 'MW', time: '09:30-10:45', examDate: '2024-06-15 08:30',
                        instructorId: instSmith.id
                    }
                ]
            }
        }
    })

    await prisma.course.create({
        data: {
            code: 'CSC 202',
            title: 'Data Structures',
            credits: 3,
            description: 'Advanced data structures and algorithms...',
            departmentId: deptCS.id,
            collegeId: colIT.id,
            instructorId: instJones.id
        }
    })

    await prisma.course.create({
        data: {
            code: 'ITIS 101',
            title: 'Introduction to Information Systems',
            credits: 3,
            description: 'Basic concepts of IS...',
            departmentId: deptIS.id,
            collegeId: colIT.id
        }
    })

    await prisma.course.create({
        data: {
            code: 'MENG 372',
            title: 'Thermodynamics',
            credits: 3,
            description: 'Laws of thermodynamics...',
            departmentId: deptMech.id,
            collegeId: colEng.id
        }
    })

    console.log('Seeding finished.')
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
