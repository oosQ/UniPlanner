export type Semester = "First" | "Second" | "Summer"
export type Year = "2023-2024" | "2024-2025" | "2025-2026"

export interface Department {
    id: string
    name: string
    collegeId: string
}

export interface College {
    id: string
    name: string
}

export interface Course {
    id: string
    code: string
    title: string
    credits: number
    description: string
    departmentId: string
    collegeId: string
    instructor?: string | { name: string } | null
    examDate?: string
}

export const COLLEGES: College[] = [
    { id: "IT", name: "College of Information Technology" },
    { id: "ENG", name: "College of Engineering" },
    { id: "BUS", name: "College of Business Administration" },
]

export const DEPARTMENTS: Department[] = [
    { id: "CS", name: "Computer Science", collegeId: "IT" },
    { id: "IS", name: "Information Systems", collegeId: "IT" },
    { id: "CE", name: "Computer Engineering", collegeId: "IT" },
    { id: "MECH", name: "Mechanical Engineering", collegeId: "ENG" },
    { id: "CIVIL", name: "Civil Engineering", collegeId: "ENG" },
    { id: "MGT", name: "Management", collegeId: "BUS" },
    { id: "ACC", name: "Accounting", collegeId: "BUS" },
]

export const COURSES: Course[] = [
    {
        id: "1",
        code: "CSC 103",
        title: "Computer Programming I",
        credits: 3,
        description: "Introduction to problem solving and programming...",
        departmentId: "CS",
        collegeId: "IT",
        instructor: "Dr. A. Smith",
        examDate: "2024-06-15 08:30"
    },
    {
        id: "2",
        code: "CSC 202",
        title: "Data Structures",
        credits: 3,
        description: "Advanced data structures and algorithms...",
        departmentId: "CS",
        collegeId: "IT",
        instructor: "Dr. B. Jones",
        examDate: "2024-06-18 11:30"
    },
    {
        id: "3",
        code: "ITIS 101",
        title: "Introduction to Information Systems",
        credits: 3,
        description: "Basic concepts of IS...",
        departmentId: "IS",
        collegeId: "IT",
        instructor: "Dr. C. White",
        examDate: "2024-06-20 14:30"
    },
    {
        id: "4",
        code: "MENG 372",
        title: "Thermodynamics",
        credits: 3,
        description: "Laws of thermodynamics...",
        departmentId: "MECH",
        collegeId: "ENG",
        instructor: "Dr. D. Brown",
        examDate: "2024-06-12 08:30"
    },
    {
        id: "5",
        code: "ACC 112",
        title: "Financial Accounting I",
        credits: 3,
        description: "Principles of accounting...",
        departmentId: "ACC",
        collegeId: "BUS",
        instructor: "Dr. E. Black",
        examDate: "2024-06-10 11:30"
    },
    {
        id: "6",
        code: "CSC 311",
        title: "Algorithms",
        credits: 3,
        description: "Algorithm analysis and design...",
        departmentId: "CS",
        collegeId: "IT"
    },
    {
        id: "7",
        code: "CE 201",
        title: "Digital Logic",
        credits: 4,
        description: "Boolean algebra and digital circuits...",
        departmentId: "CE",
        collegeId: "IT",
        instructor: "Eng. F. Green"
    }
]
