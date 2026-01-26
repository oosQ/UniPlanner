"use client"

import { useState } from "react"
import { CourseCard } from "@/components/course-card"
import { CourseFilters } from "@/components/course-filters"
import { COURSES } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { FilterIcon, SearchIcon, BookOpen } from "lucide-react"
import { Input } from "@/components/ui/input"

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
        <div className="min-h-screen bg-background">
            {/* Hero Header */}
            <div className="bg-primary/5 border-b pb-8 pt-12 px-4 md:px-8">
                <div className="container mx-auto max-w-6xl">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Course Catalog
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mb-6">
                        Explore the complete University of Bahrain course offerings. Plan your schedule, check prerequisites, and find instructor details.
                    </p>

                    <div className="flex gap-4 items-center">
                        <div className="relative w-full max-w-md">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Quick search by code or title..."
                                className="pl-9 bg-background/50 backdrop-blur-sm border-primary/20 focus-visible:ring-primary/30"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        {/* Mobile Filter Toggle */}
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="md:hidden">
                                    <FilterIcon className="mr-2 h-4 w-4" /> Filters
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left">
                                <SheetHeader className="mb-4">
                                    <SheetTitle>Filters</SheetTitle>
                                </SheetHeader>
                                <CourseFilters
                                    search={search} setSearch={setSearch}
                                    college={college} setCollege={setCollege}
                                    department={department} setDepartment={setDepartment}
                                    year={year} setYear={setYear}
                                    semester={semester} setSemester={setSemester}
                                />
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>

            <div className="container mx-auto max-w-6xl py-8 px-4 flex flex-col md:flex-row gap-8">
                {/* Desktop Sidebar */}
                <aside className="hidden md:block w-72 flex-shrink-0 sticky top-8 h-fit">
                    <div className="bg-card border rounded-xl shadow-sm p-6">
                        <CourseFilters
                            search={search} setSearch={setSearch}
                            college={college} setCollege={setCollege}
                            department={department} setDepartment={setDepartment}
                            year={year} setYear={setYear}
                            semester={semester} setSemester={setSemester}
                        />
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            <span className="font-semibold text-lg">{filteredCourses.length} Courses Found</span>
                        </div>
                        <span className="text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
                            {semester} {year}
                        </span>
                    </div>

                    {filteredCourses.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                            {filteredCourses.map((course) => (
                                <CourseCard key={course.id} course={course} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/20">
                            <div className="bg-muted p-4 rounded-full mb-4">
                                <SearchIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No courses found</h3>
                            <p className="text-muted-foreground max-w-sm mb-6">
                                We couldn't find any courses matching "{search}" in the selected filters.
                            </p>
                            <Button
                                onClick={() => {
                                    setSearch("")
                                    setCollege("all")
                                    setDepartment("all")
                                }}
                                variant="secondary"
                            >
                                Clear all filters
                            </Button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
