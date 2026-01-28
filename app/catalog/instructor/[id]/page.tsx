
import { prisma } from "@/lib/prisma"
import Image from "next/image"
import { notFound } from "next/navigation"

export default async function InstructorPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    // Parse numeric ID
    const id = parseInt(params.id)

    if (isNaN(id)) return notFound()

    const instructor = await prisma.instructor.findUnique({
        where: { id },
        include: { courses: true }
    })

    if (!instructor) return notFound()

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">

                {/* Top Banner / Avatar */}
                <div className="relative h-40 bg-gradient-to-r from-emerald-600 to-teal-700">
                    <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 p-2 bg-white rounded-full shadow-lg">
                        <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white">
                            <Image
                                src={instructor.photoUrl || "/placeholder-avatar.png"}
                                alt={instructor.name}
                                fill
                                className="object-cover"
                            />
                        </div>
                    </div>
                </div>

                {/* Main Info */}
                <div className="pt-20 pb-8 px-6 text-center">

                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{instructor.name}</h1>

                    <div className="space-y-1 mb-6">
                        {instructor.degree && (
                            <span className="block text-lg text-emerald-700 font-medium">
                                {instructor.degree}
                            </span>
                        )}
                        {instructor.role && (
                            <span className="block text-sm text-gray-500 uppercase tracking-wider font-semibold">
                                {instructor.role}
                            </span>
                        )}
                        {instructor.college && (
                            <span className="inline-block mt-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                {instructor.college}
                            </span>
                        )}
                    </div>

                    {/* Grid for Contact Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 max-w-2xl mx-auto text-left bg-gray-50 p-6 rounded-2xl border border-gray-100">

                        {/* Email */}
                        <div className="flex flex-col items-center md:items-start text-center md:text-left">
                            <span className="text-xs text-gray-400 uppercase font-bold mb-1">Email</span>
                            <a href={`mailto:${instructor.email}`} className="text-sm font-medium text-emerald-600 hover:underline break-all">
                                {instructor.email}
                            </a>
                        </div>

                        {/* Office */}
                        <div className="flex flex-col items-center md:items-start text-center md:text-left">
                            <span className="text-xs text-gray-400 uppercase font-bold mb-1">Office</span>
                            <span className="text-sm font-medium text-gray-800">
                                {instructor.office || "N/A"}
                            </span>
                        </div>

                        {/* Phone */}
                        <div className="flex flex-col items-center md:items-start text-center md:text-left">
                            <span className="text-xs text-gray-400 uppercase font-bold mb-1">Phone</span>
                            <span className="text-sm font-medium text-gray-800">
                                {instructor.phone || "N/A"}
                            </span>
                        </div>

                    </div>

                    {/* View Profile Link */}
                    {instructor.profileUrl && (
                        <div className="mt-8">
                            <a href={instructor.profileUrl} target="_blank" className="inline-flex items-center text-sm text-gray-400 hover:text-emerald-600 transition-colors">
                                <span>View Official Page at UOB</span>
                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                            </a>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}
