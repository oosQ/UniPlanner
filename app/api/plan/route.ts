import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import { writeFile, unlink } from "fs/promises"
import path from "path"
import os from "os"
import { parseStudyPlan } from "@/lib/plan-utils"

const execAsync = promisify(exec)

export async function POST(request: Request) {
    let tempFilePath: string | null = null

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

        // Convert file to buffer and save to temp file
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        // Create temp file
        tempFilePath = path.join(os.tmpdir(), `plan-${Date.now()}.pdf`)
        await writeFile(tempFilePath, buffer)

        // Use pdftotext to extract text
        const { stdout } = await execAsync(`pdftotext "${tempFilePath}" -`)
        const rawText = stdout

        // Clean up temp file
        await unlink(tempFilePath)
        tempFilePath = null

        // Parse the raw text into structured data
        const parsedData = parseStudyPlan(rawText)

        return NextResponse.json({
            success: true,
            rawText,
            data: parsedData
        })

    } catch (error) {
        console.error("Study plan parsing error:", error)
        
        // Clean up temp file if it exists
        if (tempFilePath) {
            try {
                await unlink(tempFilePath)
            } catch (e) {
                // Ignore cleanup errors
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to parse study plan"
            },
            { status: 500 }
        )
    }
}
