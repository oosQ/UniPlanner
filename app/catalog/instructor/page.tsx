
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import Image from "next/image"

export const dynamic = 'force-dynamic'

export default async function InstructorListPage() {
    const instructors = await prisma.instructor.findMany({
        orderBy: { name: 'asc' }
    })

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">All Instructors</h1>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {instructors.map((instructor) => (
                        <Link
                            key={instructor.id}
                            href={`/catalog/instructor/${instructor.id}`}
                            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden group"
                        >
                            <div className="p-6 flex flex-col items-center text-center">
                                <div className="relative w-24 h-24 mb-4 rounded-full overflow-hidden bg-gray-100 group-hover:scale-105 transition-transform duration-200">
                                    <Image
                                        src={instructor.photoUrl || "/placeholder-avatar.png"}
                                        alt={instructor.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>

                                <h3 className="text-lg font-semibold text-gray-900 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                                    {instructor.name}
                                </h3>

                                {instructor.degree && (
                                    <p className="text-xs text-indigo-600 font-medium mt-1 line-clamp-1">
                                        {instructor.degree}
                                    </p>
                                )}

                                {instructor.college && (
                                    <p className="mt-2 inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600">
                                        {instructor.college}
                                    </p>
                                )}
                            </div>
                        </Link>
                    ))}

                    {instructors.length === 0 && (
                        <p className="col-span-full text-center text-gray-500 py-12">
                            No instructors found. Run the scraper to identify instructors.
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
