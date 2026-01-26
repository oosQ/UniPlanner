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
        <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/50 hover:border-l-primary">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="font-mono text-xs">{course.code}</Badge>
                            {course.credits && <Badge variant="secondary" className="text-xs">{course.credits} Cr</Badge>}
                        </div>
                        <CardTitle className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">
                            {course.title}
                        </CardTitle>
                        <CardDescription className="text-sm font-medium">{dept?.name}</CardDescription>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{course.description}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="grid gap-3 pt-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-md">
                    <UserIcon className="h-4 w-4 text-primary" />
                    <span className="font-medium">{course.instructor || "Instructor TBA"}</span>
                </div>

                {course.examDate && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-md">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        <span className="font-medium">Final: {course.examDate}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
