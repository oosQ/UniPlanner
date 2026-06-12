import { NextResponse } from "next/server"
import { extractPdfText } from "@/lib/pdf-utils"
import { parseUOBTranscript } from "@/lib/transcript-utils"

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
