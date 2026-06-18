import { NextResponse } from "next/server"
import { extractPdfText } from "@/lib/pdf-utils"
import { parseStudyPlan } from "@/lib/plan-utils"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import * as fs from "fs"
import * as path from "path"

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const college = searchParams.get("college")
        const program = searchParams.get("program")
        const year = searchParams.get("year")

        const plansDir = path.join(process.cwd(), "data", "plans")

        // If specific plan parameters are provided, return that plan
        if (college && program && year) {
            if (isSupabaseConfigured && supabase) {
                try {
                    const { data, error } = await supabase
                        .from("study_plans")
                        .select("plan_data")
                        .eq("college_slug", college)
                        .eq("program_slug", program)
                        .eq("year", year.toString())
                        .maybeSingle()

                    if (data && !error) {
                        return NextResponse.json({
                            success: true,
                            data: data.plan_data
                        })
                    }
                } catch (dbErr) {
                    console.error("Supabase plan fetch error, falling back:", dbErr)
                }
            }

            // Sanitize inputs to prevent directory traversal
            const cleanCollege = college.replace(/[^a-zA-Z0-9_-]/g, "")
            const cleanProgram = program.replace(/[^a-zA-Z0-9_-]/g, "")
            const cleanYear = year.replace(/[^0-9]/g, "")

            const filePath = path.join(plansDir, cleanCollege, cleanProgram, `${cleanYear}.json`)
            if (!fs.existsSync(filePath)) {
                return NextResponse.json(
                    { success: false, error: "Study plan not found" },
                    { status: 404 }
                )
            }

            const planJson = fs.readFileSync(filePath, "utf-8")
            const planData = JSON.parse(planJson)

            return NextResponse.json({
                success: true,
                data: planData
            })
        }

        // Check Supabase first if configured to get dynamic manifest
        if (isSupabaseConfigured && supabase) {
            try {
                const { data, error } = await supabase
                    .from("study_plans")
                    .select("college_name, college_slug, program_name, program_slug, year")

                if (data && !error && data.length > 0) {
                    const collegeMap = new Map<string, { college: string; slug: string; programs: Map<string, { name: string; slug: string; years: Set<string> }> }>()

                    for (const row of data) {
                        if (!collegeMap.has(row.college_slug)) {
                            collegeMap.set(row.college_slug, {
                                college: row.college_name,
                                slug: row.college_slug,
                                programs: new Map()
                            })
                        }

                        const colObj = collegeMap.get(row.college_slug)!
                        if (!colObj.programs.has(row.program_slug)) {
                            colObj.programs.set(row.program_slug, {
                                name: row.program_name,
                                slug: row.program_slug,
                                years: new Set()
                            })
                        }

                        colObj.programs.get(row.program_slug)!.years.add(row.year)
                    }

                    const manifestData = Array.from(collegeMap.values()).map(col => ({
                        college: col.college,
                        slug: col.slug,
                        programs: Array.from(col.programs.values()).map(prog => ({
                            name: prog.name,
                            slug: prog.slug,
                            years: Array.from(prog.years).sort((a, b) => b.localeCompare(a))
                        })).sort((a, b) => a.name.localeCompare(b.name))
                    }))

                    return NextResponse.json({
                        success: true,
                        data: manifestData
                    })
                }
            } catch (dbErr) {
                console.error("Supabase manifest fetch error, falling back:", dbErr)
            }
        }

        // Otherwise return the manifest
        const manifestPath = path.join(plansDir, "manifest.json")
        if (!fs.existsSync(manifestPath)) {
            return NextResponse.json(
                { success: false, error: "Manifest not found. Please run the scraper script first." },
                { status: 404 }
            )
        }

        const manifestJson = fs.readFileSync(manifestPath, "utf-8")
        const manifestData = JSON.parse(manifestJson)

        return NextResponse.json({
            success: true,
            data: manifestData
        })
    } catch (error) {
        console.error("Error fetching study plans:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch study plans"
            },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get("plan") as File

        if (!file) {
            return NextResponse.json(
                { success: false, error: "No file uploaded" },
                { status: 400 }
            )
        }

        // Validate file type
        if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
            return NextResponse.json(
                { success: false, error: "Invalid file type. Please upload a PDF file." },
                { status: 400 }
            )
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { success: false, error: "File too large. Maximum size is 10MB." },
                { status: 400 }
            )
        }

        // Convert file to Uint8Array and extract text using native JS utility
        const arrayBuffer = await file.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        const rawText = await extractPdfText(uint8Array)

        // Parse the raw text into structured data
        const parsedData = parseStudyPlan(rawText)

        return NextResponse.json({
            success: true,
            rawText,
            data: parsedData
        })

    } catch (error) {
        console.error("Study plan parsing error:", error)
        
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to parse study plan"
            },
            { status: 500 }
        )
    }
}
