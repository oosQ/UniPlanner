"use client"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useQuery } from "@tanstack/react-query"
import { College, Department } from "@/lib/mock-data" // Only types

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

async function fetchColleges() {
    const res = await fetch('/api/colleges')
    if (!res.ok) throw new Error("Failed to fetch colleges")
    return res.json()
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

    const { data: colleges } = useQuery<College[]>({
        queryKey: ['colleges'],
        queryFn: fetchColleges
    })

    // Derive departments from the selected college
    const selectedCollegeData = colleges?.find(c => c.id === college)
    // @ts-ignore - mock data types mismatch slightly with Prisma types where departments is an array
    const departments = selectedCollegeData?.departments || []

    return (
        <div className="space-y-6">
            <div className="grid gap-2">
                <Label className="text-sm font-medium">Search</Label>
                <Input
                    placeholder="Keywords..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-background"
                />
            </div>

            <div className="space-y-4">
                <div className="grid gap-2">
                    <Label className="text-sm font-medium">Academic Year</Label>
                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="bg-background">
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
                    <Label className="text-sm font-medium">Semester</Label>
                    <Select value={semester} onValueChange={setSemester}>
                        <SelectTrigger className="bg-background">
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

            <div className="space-y-4 pt-4 border-t">
                <div className="grid gap-2">
                    <Label className="text-sm font-medium">College</Label>
                    <Select value={college} onValueChange={(val) => {
                        setCollege(val)
                        setDepartment("all")
                    }}>
                        <SelectTrigger className="bg-background">
                            <SelectValue placeholder="All Colleges" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Colleges</SelectItem>
                            {colleges?.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label className="text-sm font-medium">Department</Label>
                    <Select value={department} onValueChange={setDepartment} disabled={!college || college === 'all'}>
                        <SelectTrigger className="bg-background">
                            <SelectValue placeholder="All Departments" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            {departments.map((d: Department) => (
                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    )
}
