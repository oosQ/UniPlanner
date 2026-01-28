
import { ExpandableText } from "@/components/expandable-text"
import { prisma } from "@/lib/prisma"
import Image from "next/image"
import { notFound } from "next/navigation"

export default async function InstructorPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const id = parseInt(params.id)

    if (isNaN(id)) return notFound()

    const instructor = await prisma.instructor.findUnique({
        where: { id },
        include: { courses: true }
    })

    if (!instructor) return notFound()

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">

                {/* Top Banner */}
                <div className="relative h-40 bg-gradient-to-r from-emerald-600 to-teal-700">
                    {/* Avatar positioning */}
                    <div className="absolute -bottom-16 left-8 p-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-lg">
                        <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800">
                            <Image
                                src={instructor.photoUrl || "/placeholder-avatar.png"}
                                alt={instructor.name}
                                fill
                                className="object-cover"
                            />
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="pt-20 pb-8 px-8">
                    <div className="flex flex-col md:flex-row justify-between items-start">

                        {/* Name & Titles */}
                        <div className="space-y-2 mt-4 ml-2">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{instructor.name}</h1>

                            <div className="flex flex-col gap-1">
                                {instructor.degree && (
                                    <span className="text-lg text-emerald-700 dark:text-emerald-400 font-medium">
                                        {instructor.degree}
                                    </span>
                                )}
                                {(instructor.college || instructor.department) && (
                                    <span className="text-md text-gray-600 dark:text-gray-300 font-medium">
                                        {[instructor.college, instructor.department].filter(Boolean).join(" - ")}
                                    </span>
                                )}


                            </div>
                        </div>

                        {/* Contact Box (right side on desktop) */}
                        <div className="mt-8 md:mt-0 md:ml-8 bg-gray-50 dark:bg-slate-800/50 p-5 rounded-xl border border-gray-100 dark:border-slate-700 min-w-[250px]">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Details</h3>
                            <div className="space-y-3">
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Email</span>
                                    <a href={`mailto:${instructor.email}`} className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline break-all">
                                        {instructor.email}
                                    </a>
                                </div>
                                {instructor.phone && (
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Phone</span>
                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{instructor.phone}</span>
                                    </div>
                                )}
                                {instructor.office && (
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Office</span>
                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{instructor.office}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <hr className="my-8 border-gray-100 dark:border-gray-800" />

                    {/* Biography / Description */}
                    {instructor.biography && (
                        <section className="mb-8">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Description</h2>
                            <div className="prose prose-emerald dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                                <ExpandableText text={instructor.biography} limit={150} />
                            </div>
                        </section>
                    )}

                    {/* Link Footer */}
                    {instructor.profileUrl && (
                        <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800">
                            <a href={instructor.profileUrl} target="_blank" className="inline-flex items-center text-sm text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
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
