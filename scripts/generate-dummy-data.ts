import fs from 'fs'
import path from 'path'

const COLLEGES = [
    { id: 'IT', name: 'College of Information Technology' },
    { id: 'ENG', name: 'College of Engineering' },
    { id: 'BUS', name: 'College of Business Administration' },
    { id: 'SCI', name: 'College of Science' },
    { id: 'ARTS', name: 'College of Arts' },
]

const DEPARTMENTS = [
    { id: 'CS', name: 'Computer Science', collegeId: 'IT' },
    { id: 'IS', name: 'Information Systems', collegeId: 'IT' },
    { id: 'CE', name: 'Computer Engineering', collegeId: 'IT' },
    { id: 'MECH', name: 'Mechanical Engineering', collegeId: 'ENG' },
    { id: 'CIVIL', name: 'Civil Engineering', collegeId: 'ENG' },
    { id: 'CHEM', name: 'Chemical Engineering', collegeId: 'ENG' },
    { id: 'MGT', name: 'Management', collegeId: 'BUS' },
    { id: 'ACC', name: 'Accounting', collegeId: 'BUS' },
    { id: 'MKT', name: 'Marketing', collegeId: 'BUS' },
    { id: 'MATH', name: 'Mathematics', collegeId: 'SCI' },
    { id: 'PHY', name: 'Physics', collegeId: 'SCI' },
    { id: 'HIST', name: 'History', collegeId: 'ARTS' },
]

const INSTRUCTORS = [
    'Dr. Alice Smith', 'Dr. Bob Jones', 'Dr. Charlie Brown', 'Dr. David White',
    'Dr. Eve Black', 'Dr. Frank Green', 'Dr. Grace Hall', 'Dr. Henry Ford',
    'Dr. Ivy Lee', 'Dr. Jack King', 'Dr. Kelly Scott', 'Dr. Liam Turner'
]

function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateCourses() {
    const courses = []

    for (const dept of DEPARTMENTS) {
        // Generate 5-10 courses per department
        const numCourses = getRandomInt(5, 10)

        for (let i = 1; i <= numCourses; i++) {
            const level = getRandomInt(1, 4) * 100
            const codeNum = level + getRandomInt(1, 99)
            const code = `${dept.id} ${codeNum}`

            const course = {
                code,
                title: `${dept.name} Topic ${i}`,
                credits: 3,
                description: `This is a placeholder description for ${code}. It covers fundamental concepts of ${dept.name}.`,
                departmentId: dept.id,
                collegeId: dept.collegeId,
                instructorName: INSTRUCTORS[getRandomInt(0, INSTRUCTORS.length - 1)],
                sections: Array.from({ length: getRandomInt(1, 3) }).map((_, idx) => ({
                    crn: `${getRandomInt(10000, 99999)}`,
                    section: `0${idx + 1}`,
                    semester: 'First',
                    year: '2024-2025',
                    days: idx % 2 === 0 ? 'UTH' : 'MW',
                    time: idx % 2 === 0 ? '08:00-08:50' : '09:30-10:45',
                    examDate: '2025-01-15 08:30',
                    instructorName: INSTRUCTORS[getRandomInt(0, INSTRUCTORS.length - 1)]
                }))
            }
            courses.push(course)
        }
    }
    return { colleges: COLLEGES, departments: DEPARTMENTS, courses }
}

const data = generateCourses()
const outputPath = path.join(process.cwd(), 'data', 'dummy-courses.json')

// Ensure directory exists
if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
}

fs.writeFileSync(outputPath, JSON.stringify(data, null, 2))
console.log(`Generated ${data.courses.length} courses to ${outputPath}`)
