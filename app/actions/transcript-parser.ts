"use server"

import { PDFParse } from "pdf-parse"
import { TranscriptParseResult } from "@/lib/types"

/**
 * Stage 2: Basic PDF text extraction
 * Accepts a PDF file and extracts raw text for debugging
 */
export async function parseTranscript(formData: FormData): Promise<TranscriptParseResult> {
    try {
        const file = formData.get("transcript") as File
        
        if (!file) {
            return {
                success: false,
                error: "No file uploaded"
            }
        }

        // Validate file type
        if (file.type !== "application/pdf") {
            return {
                success: false,
                error: "Invalid file type. Please upload a PDF file."
            }
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
            return {
                success: false,
                error: "File too large. Maximum size is 10MB."
            }
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Extract text from PDF
        const parser = new PDFParse({ data: buffer })
        const textResult = await parser.getText()
        const rawText = textResult.text
        
        // Clean up
        await parser.destroy()

        // Stage 2: Just return raw text for debugging
        // Stage 3 will parse this into structured data
        return {
            success: true,
            rawText,
            data: {
                studentName: "",
                studentNumber: "",
                semesters: []
            }
        }

    } catch (error) {
        console.error("Transcript parsing error:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to parse transcript"
        }
    }
}
