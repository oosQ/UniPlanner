import * as fs from "fs"
import * as path from "path"
import * as cheerio from "cheerio"
import { extractPdfText } from "../lib/pdf-utils"
import { parseStudyPlan } from "../lib/plan-utils"

const COLLEGES: Record<string, string> = {
    "College of Applied Studies": "http://cas.uob.edu.bh",
    "Bahrain Teachers College": "https://teachers.uob.edu.bh",
    "College of Engineering": "http://engineering.uob.edu.bh",
    "College of Information Technology": "http://cit.uob.edu.bh",
    "College of Science": "http://science.uob.edu.bh",
    "College of Arts": "http://arts.uob.edu.bh",
    "College of Business Administration": "http://cob.uob.edu.bh",
    "College of Health and Sport Sciences": "http://chss.uob.edu.bh",
    "College of Law": "http://law.uob.edu.bh"
}

const PLANS_DIR = path.join(process.cwd(), "data", "plans")

// Ensure plans directory exists
if (!fs.existsSync(PLANS_DIR)) {
    fs.mkdirSync(PLANS_DIR, { recursive: true })
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
}

async function fetchWithTimeout(url: string, options: any = {}, timeout = 10000): Promise<Response> {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        })
        clearTimeout(id)
        return response
    } catch (err) {
        clearTimeout(id)
        throw err
    }
}

async function scrapeCollege(collegeName: string, baseUrl: string, manifest: any[]) {
    console.log(`\n==================================================`)
    console.log(`Scraping ${collegeName} (${baseUrl})...`)
    console.log(`==================================================`)

    const collegeSlug = slugify(collegeName)
    const collegeDir = path.join(PLANS_DIR, collegeSlug)
    if (!fs.existsSync(collegeDir)) {
        fs.mkdirSync(collegeDir, { recursive: true })
    }

    const collegeManifest: any = {
        college: collegeName,
        slug: collegeSlug,
        programs: []
    }

    // Try undergraduate page first, then fall back to base URL
    const urlsToTry = [`${baseUrl}/undergraduate/`, `${baseUrl}/`]
    let html = ""
    let resolvedUrl = ""

    for (const url of urlsToTry) {
        try {
            console.log(`Trying to fetch: ${url}`)
            const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } })
            if (res.ok) {
                html = await res.text()
                resolvedUrl = url
                break
            } else {
                console.log(`  Failed with status: ${res.status}`)
            }
        } catch (err: any) {
            console.log(`  Error fetching ${url}: ${err.message}`)
        }
    }

    if (!html) {
        console.log(`Could not fetch HTML for ${collegeName}. Skipping.`)
        return
    }

    const $ = cheerio.load(html)
    const links = $("a[href]")
    const programPages: { url: string; title: string }[] = []
    const directPdfPlans: { url: string; title: string }[] = []

    links.each((_, elem) => {
        const href = $(elem).attr("href") || ""
        const text = $(elem).text().trim()
        if (!href) return

        // Resolve relative URLs
        let fullUrl = href
        if (href.startsWith("/")) {
            fullUrl = `${baseUrl}${href}`
        } else if (!href.startsWith("http")) {
            fullUrl = `${baseUrl}/${href}`
        }

        // Only process links on the same subdomain
        if (!fullUrl.startsWith(baseUrl)) return

        const lowerText = text.toLowerCase()
        const lowerUrl = fullUrl.toLowerCase()

        // Check for direct PDF plans
        if (lowerUrl.endsWith(".pdf") && (
            lowerUrl.includes("plan") ||
            lowerUrl.includes("curriculum") ||
            lowerUrl.includes("detailed") ||
            lowerText.includes("plan") ||
            lowerText.includes("curriculum") ||
            lowerText.includes("detailed")
        )) {
            directPdfPlans.push({ url: fullUrl, title: text || path.basename(fullUrl, ".pdf") })
            return
        }

        // Detect program pages
        const isProgram = 
            lowerUrl.includes("/undergraduate/") || 
            lowerUrl.includes("/b-sc-") || 
            lowerUrl.includes("/ba-") || 
            lowerUrl.includes("/bachelor-") ||
            lowerUrl.includes("/diploma-") ||
            lowerUrl.includes("/associate-") ||
            anyKeyword(lowerText, ["b.sc", "b.a", "bachelor", "diploma", "associate", "degree", "program"])

        // Omit static assets and non-program pages
        if (isProgram && 
            !lowerUrl.endsWith(".png") && 
            !lowerUrl.endsWith(".jpg") && 
            !lowerUrl.endsWith(".pdf") &&
            fullUrl !== `${baseUrl}/undergraduate/` &&
            fullUrl !== `${baseUrl}/` &&
            fullUrl !== `${baseUrl}`
        ) {
            if (!programPages.some(p => p.url === fullUrl)) {
                programPages.push({ url: fullUrl, title: text })
            }
        }
    })

    console.log(`Found ${programPages.length} program pages and ${directPdfPlans.length} direct PDF plans.`)

    // Process direct PDF plans
    for (const pdf of directPdfPlans) {
        console.log(`Processing direct PDF plan: ${pdf.title} (${pdf.url})`)
        await downloadAndProcessPlan(pdf.url, pdf.title, collegeSlug, collegeManifest)
    }

    // Process program pages
    for (const page of programPages) {
        console.log(`Visiting program page: ${page.title} (${page.url})`)
        try {
            const res = await fetchWithTimeout(page.url, { headers: { "User-Agent": "Mozilla/5.0" } })
            if (!res.ok) {
                console.log(`  Failed to fetch: ${res.status}`)
                continue
            }
            const pageHtml = await res.text()
            const page$ = cheerio.load(pageHtml)
            const pdfLinks = page$("a[href]")

            const foundPdfs: { url: string; text: string }[] = []
            pdfLinks.each((_, elem) => {
                const href = page$(elem).attr("href") || ""
                const text = page$(elem).text().trim()
                if (href.toLowerCase().endsWith(".pdf")) {
                    let fullPdfUrl = href
                    if (href.startsWith("/")) {
                        fullPdfUrl = `${baseUrl}${href}`
                    } else if (!href.startsWith("http")) {
                        fullPdfUrl = `${baseUrl}/${href}`
                    }

                    if (fullPdfUrl.startsWith(baseUrl) && !foundPdfs.some(p => p.url === fullPdfUrl)) {
                        foundPdfs.push({ url: fullPdfUrl, text })
                    }
                }
            })

            console.log(`  Found ${foundPdfs.length} PDFs on page.`)
            for (const pdf of foundPdfs) {
                const lowerText = pdf.text.toLowerCase()
                const lowerUrl = pdf.url.toLowerCase()
                const isPlan = 
                    lowerUrl.includes("plan") || 
                    lowerUrl.includes("curriculum") || 
                    lowerUrl.includes("detailed") ||
                    lowerText.includes("plan") ||
                    lowerText.includes("curriculum") ||
                    lowerText.includes("detailed")

                if (isPlan) {
                    console.log(`  Processing plan PDF: ${pdf.text} (${pdf.url})`)
                    await downloadAndProcessPlan(pdf.url, page.title || pdf.text, collegeSlug, collegeManifest)
                }
            }
        } catch (err: any) {
            console.log(`  Error processing page ${page.url}: ${err.message}`)
        }
    }

    if (collegeManifest.programs.length > 0) {
        manifest.push(collegeManifest)
    }
}

function anyKeyword(text: string, keywords: string[]): boolean {
    return keywords.some(k => text.includes(k))
}

async function downloadAndProcessPlan(pdfUrl: string, rawTitle: string, collegeSlug: string, collegeManifest: any) {
    try {
        const res = await fetchWithTimeout(pdfUrl)
        if (!res.ok) {
            console.log(`    Failed to download PDF: ${res.status}`)
            return
        }
        const buffer = await res.arrayBuffer()
        const uint8Array = new Uint8Array(buffer)

        // Extract text
        const text = await extractPdfText(uint8Array)
        if (!text || text.trim().length === 0) {
            console.log(`    Empty text extracted. Skipping.`)
            return
        }

        // Parse study plan
        const planData = parseStudyPlan(text)
        
        // Clean and set program name
        let programName = planData.degreeName || rawTitle || "Unknown Program"
        
        // CSS / HTML garbage cleanup
        const cleanGarbage = (s: string) => {
            return s
                .replace(/i\.fb-icon-element[\s\S]*$/i, "") // strip after i.fb-icon-element
                .replace(/\{[^\}]*\}/g, "") // strip anything inside curly braces
                .replace(/\b(color|hover|font-family|font-size|border|padding|margin|background|display|text-align)\s*:[\s\S]*?(;|$)/gi, "") // CSS properties
                .replace(/press here to download/gi, "")
                .replace(/download detailed study/gi, "")
                .replace(/download study/gi, "")
                .replace(/\s+/g, " ")
                .trim()
        }
        
        programName = cleanGarbage(programName)
        rawTitle = cleanGarbage(rawTitle)

        const genericNames = [
            "university study plan", 
            "detailed study plan", 
            "academic plan", 
            "study plan", 
            "programme layout", 
            "program layout", 
            "curriculum", 
            "course structure", 
            "degree plan", 
            "undergraduate program", 
            "undergraduate plan",
            "exit option",
            "guideline handbook",
            "handbook",
            "press here to download the study plan",
            "press here to download the academic plan"
        ]
        const lowerName = programName.toLowerCase()
        const isGeneric = genericNames.some(g => lowerName === g || lowerName.includes(g))
        if ((isGeneric || programName.length < 5) && rawTitle) {
            const lowerTitle = rawTitle.toLowerCase()
            const isTitleGeneric = genericNames.some(g => lowerTitle === g || lowerTitle.includes(g))
            if (!isTitleGeneric) {
                programName = rawTitle.trim()
            }
        }

        if (genericNames.some(g => programName.toLowerCase().includes(g)) || programName.length < 5) {
            programName = path.basename(pdfUrl, ".pdf")
                .replace(/_/g, " ")
                .replace(/-/g, " ")
                .replace(/\d+/g, "")
                .replace(/\s+/g, " ")
                .trim()
        }

        // Extract year version *before* stripping it
        let year = "2024" // default
        
        const filename = path.basename(pdfUrl)
        const cleanedUrl = pdfUrl.replace(/\/wp-content\/uploads\/sites\/\d+\/\d{4}\/\d{2}\//i, "")

        const programNameMatches = programName.match(/\b(20\d{2})\b/g)
        const rawTitleMatches = rawTitle.match(/\b(20\d{2})\b/g)
        const filenameMatches = filename.match(/\b(20\d{2})\b/g)
        const cleanedUrlMatches = cleanedUrl.match(/\b(20\d{2})\b/g)
        
        if (programNameMatches && programNameMatches.length > 0) {
            year = programNameMatches.find(y => y !== "2026") || programNameMatches[0]
        } else if (rawTitleMatches && rawTitleMatches.length > 0) {
            year = rawTitleMatches.find(y => y !== "2026") || rawTitleMatches[0]
        } else if (filenameMatches && filenameMatches.length > 0) {
            year = filenameMatches.find(y => y !== "2026") || filenameMatches[0]
        } else if (cleanedUrlMatches && cleanedUrlMatches.length > 0) {
            year = cleanedUrlMatches.find(y => y !== "2026") || cleanedUrlMatches[0]
        } else {
            // Search inside first 1000 characters of text
            const firstTextMatches = text.substring(0, 1000).match(/\b(20\d{2})\b/g)
            if (firstTextMatches && firstTextMatches.length > 0) {
                year = firstTextMatches.find(y => y !== "2026") || firstTextMatches[0]
            }
        }

        // Strip out the year to group versions under the same program slug/name
        programName = programName
            .replace(/\b20\d{2}\b/g, "")
            .replace(/\(\s*\)/g, "")
            .replace(/-\s*$/g, "")
            .replace(/^\s*-/g, "")
            .replace(/\s+/g, " ")
            .trim()
        
        // Capitalize first letters of words in program name for better presentation
        programName = programName
            .split(" ")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(" ")
            .replace(/\bB\b\.\bSc\b/i, "B.Sc.")
            .replace(/\bB\b\.\bA\b/i, "B.A.")
            .replace(/\bM\b\.\bSc\b/i, "M.Sc.")
            .replace(/\bPh\b\.\bD\b/i, "Ph.D.")
            .replace(/\bIt\b/i, "IT")
            .replace(/\.\./g, ".")
            .trim()

        const programSlug = slugify(programName)
        const programDir = path.join(PLANS_DIR, collegeSlug, programSlug)
        if (!fs.existsSync(programDir)) {
            fs.mkdirSync(programDir, { recursive: true })
        }

        const planFilePath = path.join(programDir, `${year}.json`)
        fs.writeFileSync(planFilePath, JSON.stringify(planData, null, 2))
        console.log(`    Successfully saved plan to ${planFilePath}`)

        // Add to manifest
        let existingProgram = collegeManifest.programs.find((p: any) => p.slug === programSlug)
        if (!existingProgram) {
            existingProgram = {
                name: programName,
                slug: programSlug,
                years: []
            }
            collegeManifest.programs.push(existingProgram)
        }
        if (!existingProgram.years.includes(year)) {
            existingProgram.years.push(year)
            existingProgram.years.sort()
        }
    } catch (err: any) {
        console.log(`    Error processing PDF ${pdfUrl}: ${err.message}`)
    }
}

async function main() {
    console.log("Starting UOB study plans scraping...")
    const manifest: any[] = []

    for (const [name, url] of Object.entries(COLLEGES)) {
        await scrapeCollege(name, url, manifest)
    }

    // Save manifest file
    const manifestPath = path.join(PLANS_DIR, "manifest.json")
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
    console.log(`\nScraping completed. Manifest saved to ${manifestPath}`)
}

main().catch(err => {
    console.error("Fatal error in main scraper script:", err)
})
