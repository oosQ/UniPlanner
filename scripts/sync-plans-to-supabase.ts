import * as fs from "fs"
import * as path from "path"
import { createClient } from "@supabase/supabase-js"

// Simple helper to load local environment variables from .env file
function loadEnv() {
    const envPath = path.join(process.cwd(), ".env")
    if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, "utf-8").split("\n")
        for (const line of lines) {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
            if (match) {
                const key = match[1]
                let value = match[2] || ""
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substring(1, value.length - 1)
                } else if (value.startsWith("'") && value.endsWith("'")) {
                    value = value.substring(1, value.length - 1)
                }
                process.env[key] = value
            }
        }
    }
}

async function main() {
    loadEnv()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    // Use Secret Key/Service Role Key if available, fallback to Anon Key
    const supabaseKey = process.env.SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SECRET_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env")
        process.exit(1)
    }

    console.log(`Connecting to Supabase at: ${supabaseUrl}`)
    const supabase = createClient(supabaseUrl, supabaseKey)

    const plansDir = path.join(process.cwd(), "data", "plans")
    const manifestPath = path.join(plansDir, "manifest.json")

    if (!fs.existsSync(manifestPath)) {
        console.error(`Error: manifest.json not found at ${manifestPath}`)
        process.exit(1)
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"))
    console.log(`Loaded manifest. Found ${manifest.length} colleges.`)

    let totalUpserted = 0

    for (const college of manifest) {
        const collegeName = college.college
        const collegeSlug = college.slug

        for (const program of college.programs) {
            const programName = program.name
            const programSlug = program.slug

            for (const year of program.years) {
                const planFilePath = path.join(plansDir, collegeSlug, programSlug, `${year}.json`)
                if (!fs.existsSync(planFilePath)) {
                    console.warn(`Warning: Study plan file not found: ${planFilePath}`)
                    continue
                }

                try {
                    const planData = JSON.parse(fs.readFileSync(planFilePath, "utf-8"))

                    console.log(`Syncing: ${collegeName} -> ${programName} (${year})`)

                    const { error } = await supabase
                        .from("study_plans")
                        .upsert({
                            college_name: collegeName,
                            college_slug: collegeSlug,
                            program_name: programName,
                            program_slug: programSlug,
                            year: year.toString(),
                            plan_data: planData
                        }, {
                            onConflict: "college_slug,program_slug,year"
                        })

                    if (error) {
                        console.error(`Failed to upsert plan for ${programName} (${year}):`, error.message)
                    } else {
                        totalUpserted++
                    }
                } catch (err) {
                    console.error(`Error processing file ${planFilePath}:`, err)
                }
            }
        }
    }

    console.log(`\nSync completed! Successfully synced ${totalUpserted} plans to Supabase.`)
}

main().catch(err => {
    console.error("Fatal error:", err)
    process.exit(1)
})
