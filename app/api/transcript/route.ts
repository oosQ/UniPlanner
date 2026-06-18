import { NextResponse } from "next/server"
import { extractPdfText } from "@/lib/pdf-utils"
import { parseUOBTranscript } from "@/lib/transcript-utils"

function getCollegeCategory(collegeName: string): string | null {
    const s = collegeName.toLowerCase().replace(/[^a-z0-9]/g, "")
    if (s.includes("informationtechnology") || s.includes("cit")) return "cit"
    if (s.includes("business") || s.includes("cob") || s.includes("administration")) return "business"
    if (s.includes("engineering")) return "engineering"
    if (s.includes("science")) return "science"
    if (s.includes("arts")) return "arts"
    if (s.includes("law")) return "law"
    if (s.includes("teachers") || s.includes("btc")) return "teachers"
    if (s.includes("health") || s.includes("sport") || s.includes("chss") || s.includes("nurse") || s.includes("pharmacy")) return "health"
    if (s.includes("appliedstudies") || s.includes("cas")) return "applied"
    return null
}

function checkCompatibility(transcriptCollege: string, transcriptProgram: string, planCollege: string, planProgram: string): { compatible: boolean; error?: string } {
    if (!transcriptProgram) {
        return { 
            compatible: false, 
            error: "Could not extract academic program from the transcript PDF. Please ensure the transcript is a UOB transcript." 
        }
    }

    if (transcriptCollege && planCollege) {
        const tcCat = getCollegeCategory(transcriptCollege)
        const pcCat = getCollegeCategory(planCollege)

        if (tcCat && pcCat && tcCat !== pcCat) {
            return {
                compatible: false,
                error: `Mismatched colleges! Your transcript belongs to '${transcriptCollege}', but you selected/uploaded a plan from '${planCollege}'.`
            }
        }

        const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
        const tcClean = clean(transcriptCollege)
        const pcClean = clean(planCollege)
        
        // Check college compatibility with fallback fuzzy matching if categories weren't resolved
        const isCollegeMatch = tcClean.includes(pcClean) || pcClean.includes(tcClean) || 
                              (tcClean.includes("informationtechnology") && pcClean.includes("cit")) ||
                              (tcClean.includes("cit") && pcClean.includes("informationtechnology")) ||
                              (tcClean.includes("business") && pcClean.includes("cob")) ||
                              (tcClean.includes("cob") && pcClean.includes("business")) ||
                              (tcClean.includes("engineering") && pcClean.includes("engineering")) ||
                              (tcClean.includes("science") && pcClean.includes("science")) ||
                              (tcClean.includes("arts") && pcClean.includes("arts")) ||
                              (tcClean.includes("law") && pcClean.includes("law")) ||
                              (tcClean.includes("teachers") && pcClean.includes("teachers")) ||
                              (tcClean.includes("health") && pcClean.includes("health"))

        if (!isCollegeMatch) {
            return {
                compatible: false,
                error: `Mismatched colleges! Your transcript belongs to '${transcriptCollege}', but you selected/uploaded a plan from '${planCollege}'.`
            }
        }
    }

    // Check program compatibility by matching keywords
    const getKeywords = (s: string) => {
        const stopWords = ["bachelor", "bsc", "ba", "science", "in", "of", "and", "undergraduate", "program", "major", "minor", "degree"]
        return s.toLowerCase()
            .split(/[^a-z]/)
            .filter(w => w.length > 2 && !stopWords.includes(w))
    }

    const tpKeywords = getKeywords(transcriptProgram)
    const ppKeywords = getKeywords(planProgram)

    const commonKeywords = tpKeywords.filter(k => ppKeywords.includes(k))
    const isProgramMatch = commonKeywords.length > 0

    if (!isProgramMatch) {
        return {
            compatible: false,
            error: `Mismatched programs! Your transcript is for '${transcriptProgram}', but you selected/uploaded the study plan for '${planProgram}'.`
        }
    }

    return { compatible: true }
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get("transcript") as File

        if (!file) {
            return NextResponse.json(
                { success: false, error: "No file uploaded" },
                { status: 400 }
            )
        }

        // Validate file type
        if (file.type !== "application/pdf") {
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
        const parsedData = parseUOBTranscript(rawText)

        // Check compatibility if plan info is provided
        const planCollege = formData.get("planCollege") as string
        const planProgram = formData.get("planProgram") as string

        if (planCollege || planProgram) {
            const compatResult = checkCompatibility(
                parsedData.college || "",
                parsedData.program || "",
                planCollege || "",
                planProgram || ""
            )
            if (!compatResult.compatible) {
                return NextResponse.json(
                    { success: false, error: compatResult.error },
                    { status: 400 }
                )
            }
        }

        // Return both raw text (for debugging) and parsed data
        return NextResponse.json({
            success: true,
            rawText,
            data: parsedData
        })

    } catch (error) {
        console.error("Transcript parsing error:", error)
        
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to parse transcript"
            },
            { status: 500 }
        )
    }
}
