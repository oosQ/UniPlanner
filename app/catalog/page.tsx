"use client"

import { useState } from "react"
import { CourseCard } from "@/components/course-card"
import { CourseFilters } from "@/components/course-filters"
import { COURSES } from "@/lib/mock-data"

export default function CatalogPage() {
    const [search, setSearch] = useState("")
    const [college, setCollege] = useState("all")
    const [department, setDepartment] = useState("all")
    const [year, setYear] = useState("2024-2025")
    const [semester, setSemester] = useState("First")

    // Filter Logic
    const filteredCourses = COURSES.filter((course) => {
        // Search
        if (search && !course.code.toLowerCase().includes(search.toLowerCase()) && !course.title.toLowerCase().includes(search.toLowerCase())) {
            return false
        }
        // College
        if (college !== "all" && course.collegeId !== college) {
            return false
        }
        // Department
        if (department !== "all" && course.departmentId !== department) {
            return false
        }
        return true
    })

    // Sort by code (default)
    filteredCourses.sort((a, b) => a.code.localeCompare(b.code))

    return (
        <div className="container mx-auto py-8 flex flex-col md:flex-row gap-8">
            {/* Sidebar Filters */}
            <aside className="w-full md:w-64 flex-shrink-0">
                <CourseFilters
                    search={search}
                    setSearch={setSearch}
                    college={college}
                    setCollege={setCollege}
                    department={department}
                    setDepartment={setDepartment}
                    year={year}
                    setYear={setYear}
                    semester={semester}
                    setSemester={setSemester}
                />
            </aside>

            {/* Main Content */}
            <main className="flex-1">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold tracking-tight">Course Catalog</h1>
                    <p className="text-muted-foreground">
                        Showing {filteredCourses.length} courses for {semester} Semester {year}
                    </p>
                </div>

                {filteredCourses.length > 0 ? (
                    <div className="grid gap-4">
                        {filteredCourses.map((course) => (
                            <CourseCard key={course.id} course={course} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 border rounded-lg bg-muted/50">
                        <p className="text-lg text-muted-foreground">No courses found matching your filters.</p>
                        <button
                            onClick={() => {
                                setSearch("")
                                setCollege("all")
                                setDepartment("all")
                            }}
                            className="mt-4 text-primary hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                )}
            </main>
        </div>
    )
}
