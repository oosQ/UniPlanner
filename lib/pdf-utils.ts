import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs"

/**
 * Extract text from a PDF buffer in a portable, cross-platform manner.
 * Mimics the vertical layout behavior of pdftotext.
 */
export async function extractPdfText(pdfBuffer: Uint8Array): Promise<string> {
    const loadingTask = pdfjs.getDocument({
        data: pdfBuffer,
        useSystemFonts: true,
        disableFontFace: true
    })
    const pdf = await loadingTask.promise
    let fullText = ""

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        
        let lines: string[] = []
        let currentLineText = ""
        let lastY: number | null = null
        let lastXEnd: number | null = null

        // Filter out empty/whitespace-only items, and sort them top-to-bottom, left-to-right
        const items = (textContent.items as any[])
            .filter((item: any) => item.str !== undefined && item.str.trim().length > 0)
            .sort((a: any, b: any) => {
                const yA = a.transform[5]
                const yB = b.transform[5]
                if (Math.abs(yA - yB) > 2.0) {
                    return yB - yA // top to bottom
                }
                return a.transform[4] - b.transform[4] // left to right
            })

        for (const item of items) {
            const str = item.str
            const x = item.transform[4]
            const y = item.transform[5]
            const width = item.width

            if (lastY === null || Math.abs(y - lastY) > 2.0) {
                if (currentLineText.trim().length > 0) {
                    lines.push(currentLineText.trim())
                }
                currentLineText = str
                lastY = y
                lastXEnd = x + width
            } else {
                const gap = x - lastXEnd!
                if (gap < 10.0) {
                    // Small gap: merge on the same line, inserting space if necessary
                    if (gap > 1.0 && !currentLineText.endsWith(" ")) {
                        currentLineText += " "
                    }
                    currentLineText += str
                    lastXEnd = x + width
                } else {
                    // Large gap: treat as column separator / start new line
                    if (currentLineText.trim().length > 0) {
                        lines.push(currentLineText.trim())
                    }
                    currentLineText = str
                    lastXEnd = x + width
                }
            }
        }

        if (currentLineText.trim().length > 0) {
            lines.push(currentLineText.trim())
        }

        // Separate pages with form feed character, same as pdftotext
        fullText += lines.join("\n") + "\n\f"
    }

    return fullText
}
