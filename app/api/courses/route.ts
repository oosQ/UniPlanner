import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const collegeId = searchParams.get('collegeId')
    const departmentId = searchParams.get('departmentId')
    const year = searchParams.get('year')
    const semester = searchParams.get('semester')

    const where: Prisma.CourseWhereInput = {}

    if (search) {
        where.OR = [
            { code: { contains: search } }, // Case insensitive usually supported by DB, SQLite supports it
            { title: { contains: search } }
        ]
    }

    if (collegeId && collegeId !== 'all') {
        where.collegeId = collegeId
    }

    if (departmentId && departmentId !== 'all') {
        where.departmentId = departmentId
    }

    // Note: Filtering by year/semester typically happens on the Section level, 
    // but for the catalog view we often want to show courses that *have* sections in that term.
    // For simplicity in this milestone, we will filter courses where at least one section matches.
    if (year || semester) {
        where.sections = {
            some: {
                ...(year ? { year } : {}),
                ...(semester ? { semester } : {})
            }
        }
    }

    try {
        const courses = await prisma.course.findMany({
            where,
            include: {
                department: true,
                sections: { // Include sections to show details
                    where: {
                        ...(year ? { year } : {}),
                        ...(semester ? { semester } : {})
                    }
                },
                instructor: true
            },
            orderBy: {
                code: 'asc'
            }
        })
        return NextResponse.json(courses)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
    }
}
