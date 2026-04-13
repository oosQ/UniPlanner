"use client"

import Image from "next/image"
import { useState } from "react"
import { User } from "lucide-react"

interface InstructorAvatarProps {
    src: string | null
    alt: string
    fill?: boolean
    className?: string
    sizes?: string
}

export function InstructorAvatar({ src, alt, fill = true, className = "", sizes }: InstructorAvatarProps) {
    const [imageError, setImageError] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // Use default avatar if no src or if image failed to load
    const shouldShowDefault = !src || imageError

    if (shouldShowDefault) {
        return (
            <div className={`bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 flex items-center justify-center ${className}`}>
                <User className="w-1/2 h-1/2 text-emerald-600 dark:text-emerald-400" />
            </div>
        )
    }

    return (
        <>
            {isLoading && (
                <div className={`absolute inset-0 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 flex items-center justify-center animate-pulse ${className}`}>
                    <User className="w-1/2 h-1/2 text-emerald-600 dark:text-emerald-400 opacity-50" />
                </div>
            )}
            <Image
                src={src}
                alt={alt}
                fill={fill}
                className={className}
                sizes={sizes}
                onError={() => {
                    setImageError(true)
                    setIsLoading(false)
                }}
                onLoad={() => setIsLoading(false)}
                unoptimized={src.includes('uobhomesiteprod.s3')} // Skip optimization for S3 images to avoid timeout
            />
        </>
    )
}
