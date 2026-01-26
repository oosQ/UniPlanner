import { Course, DEPARTMENTS } from "@/lib/mock-data"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, UserIcon } from "lucide-react"

interface CourseCardProps {
    course: Course
}

export function CourseCard({ course }: CourseCardProps) {
    const dept = DEPARTMENTS.find((d) => d.id === course.departmentId)

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <span className="font-bold text-primary">{course.code}</span>
                            <span className="text-lg font-normal text-foreground/80">{course.title}</span>
                        </CardTitle>
                        <CardDescription>{dept?.name} Department</CardDescription>
                    </div>
                    <Badge variant="secondary">{course.credits} Credits</Badge>
                </div>
            </CardHeader>
            <CardContent className="grid gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UserIcon className="h-4 w-4" />
                    <span>{course.instructor || "Instructor TBA"}</span>
                </div>

                {course.examDate && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        <span>Final Exam: {course.examDate}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
