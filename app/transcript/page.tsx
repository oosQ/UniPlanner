"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { TranscriptParseResult } from "@/lib/types"
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

export default function TranscriptPage() {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<TranscriptParseResult | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            setResult(null) // Clear previous results
        }
    }

    const handleUpload = async () => {
        if (!file) return

        setLoading(true)
        setResult(null)

        try {
            const formData = new FormData()
            formData.append("transcript", file)

            const response = await fetch("/api/transcript", {
                method: "POST",
                body: formData,
            })

            const parseResult: TranscriptParseResult = await response.json()
            setResult(parseResult)
        } catch (error) {
            setResult({
                success: false,
                error: error instanceof Error ? error.message : "Failed to upload transcript"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Transcript Analyzer</h1>
                <p className="text-muted-foreground">
                    Upload your University of Bahrain academic transcript to analyze your academic progress
                </p>
            </div>

            {/* Upload Section */}
            <Card className="p-6 mb-6">
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="transcript-upload" className="text-base font-semibold mb-2 block">
                            Upload Transcript PDF
                        </Label>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label
                                    htmlFor="transcript-upload"
                                    className="flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors"
                                >
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        {file ? file.name : "Choose a PDF file (max 10MB)"}
                                    </span>
                                    <input
                                        id="transcript-upload"
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            <Button
                                onClick={handleUpload}
                                disabled={!file || loading}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Analyze
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* File Info */}
                    {file && (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                        </div>
                    )}
                </div>
            </Card>

            {/* Results Section */}
            {result && (
                <Card className="p-6">
                    {result.success ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-5 w-5" />
                                <h2 className="text-lg font-semibold">Transcript Extracted Successfully</h2>
                            </div>

                            {/* Stage 2: Display raw text for debugging */}
                            {result.rawText && (
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Extracted Text (Debug View):</Label>
                                    <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg max-h-96 overflow-y-auto">
                                        <pre className="text-xs whitespace-pre-wrap font-mono">
                                            {result.rawText}
                                        </pre>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                         Stage 2: Raw text extraction complete. Parsing into structured data will be added in Stage 3.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-start gap-3 text-red-600 dark:text-red-400">
                            <AlertCircle className="h-5 w-5 mt-0.5" />
                            <div>
                                <h2 className="text-lg font-semibold mb-1">Error</h2>
                                <p className="text-sm">{result.error}</p>
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {/* Info Section */}
            {!result && (
                <Card className="p-6 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="space-y-2">
                            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                                Supported Format
                            </h3>
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                This tool is designed for University of Bahrain official transcripts in PDF format.
                                Upload your transcript to extract course information, grades, and GPA data.
                            </p>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    )
}
