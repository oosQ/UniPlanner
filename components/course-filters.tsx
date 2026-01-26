"use client"

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { COLLEGES, DEPARTMENTS } from "@/lib/mock-data"

interface CourseFiltersProps {
    search: string
    setSearch: (value: string) => void
    college: string
    setCollege: (value: string) => void
    department: string
    setDepartment: (value: string) => void
    year: string
    setYear: (value: string) => void
    semester: string
    setSemester: (value: string) => void
}

export function CourseFilters({
    search,
    setSearch,
    college,
    setCollege,
    department,
    setDepartment,
    year,
    setYear,
    semester,
    setSemester,
}: CourseFiltersProps) {

    const filteredDepartments = college
        ? DEPARTMENTS.filter((d) => d.collegeId === college)
        : DEPARTMENTS

    return (
        <div className="space-y-4 p-4 border rounded-lg bg-card">
            <h2 className="font-semibold text-lg">Filters</h2>

            <div className="grid gap-2">
                <Label htmlFor="search">Search</Label>
                <Input
                    id="search"
                    placeholder="Course code or title..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Year</Label>
                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2023-2024">2023-2024</SelectItem>
                            <SelectItem value="2024-2025">2024-2025</SelectItem>
                            <SelectItem value="2025-2026">2025-2026</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label>Semester</Label>
                    <Select value={semester} onValueChange={setSemester}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Semester" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="First">First</SelectItem>
                            <SelectItem value="Second">Second</SelectItem>
                            <SelectItem value="Summer">Summer</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-2">
                <Label>College</Label>
                <Select value={college} onValueChange={(val) => {
                    setCollege(val)
                    setDepartment("all") // Reset dept when college changes
                }}>
                    <SelectTrigger>
                        <SelectValue placeholder="All Colleges" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Colleges</SelectItem>
                        {COLLEGES.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-2">
                <Label>Department</Label>
                <Select value={department} onValueChange={setDepartment} disabled={!college || college === 'all'}>
                    <SelectTrigger>
                        <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {filteredDepartments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
