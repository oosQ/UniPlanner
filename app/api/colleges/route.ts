import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const colleges = await prisma.college.findMany({
            include: {
                departments: true
            }
        })
        return NextResponse.json(colleges)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch colleges' }, { status: 500 })
    }
}
