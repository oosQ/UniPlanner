
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Skeleton */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <Skeleton className="h-10 w-48 rounded-lg" />
                    <Skeleton className="h-4 w-32 rounded-lg" />
                </div>

                {/* Filter Skeleton */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <Skeleton className="h-11 w-full md:w-1/2 lg:w-1/3 rounded-xl" />
                    <Skeleton className="h-11 w-full md:w-1/3 lg:w-1/4 rounded-xl" />
                </div>

                {/* Grid Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col items-center">
                            <Skeleton className="w-28 h-28 rounded-full mb-5" />
                            <Skeleton className="h-6 w-3/4 mb-2 rounded-md" />
                            <Skeleton className="h-4 w-1/2 mb-3 rounded-md" />
                            <Skeleton className="h-4 w-2/3 rounded-md" />
                            <Skeleton className="h-6 w-16 mt-3 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
