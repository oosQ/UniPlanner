
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"

interface ExpandableTextProps {
    text: string
    limit?: number // word limit
}

export function ExpandableText({ text, limit = 150 }: ExpandableTextProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    const words = text.split(/\s+/)

    if (words.length <= limit) {
        return <p className="leading-relaxed">{text}</p>
    }

    const truncatedText = words.slice(0, limit).join(" ") + "..."

    return (
        <div className="space-y-2">
            <p className="leading-relaxed">
                {isExpanded ? text : truncatedText}
            </p>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-0 text-emerald-600 hover:text-emerald-700 hover:bg-transparent p-0 h-auto font-semibold"
            >
                {isExpanded ? (
                    <span className="flex items-center">
                        Show Less <ChevronUp className="ml-1 h-3 w-3" />
                    </span>
                ) : (
                    <span className="flex items-center">
                        See More <ChevronDown className="ml-1 h-3 w-3" />
                    </span>
                )}
            </Button>
        </div>
    )
}
