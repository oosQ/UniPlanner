"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { GraduationCap, BookOpen, Users } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export function Navbar() {
  const pathname = usePathname()

  const routes = [
    {
      href: "/courses",
      label: "Courses",
      icon: BookOpen,
      active: pathname === "/courses",
    },
    {
      href: "/instructor",
      label: "Instructors",
      icon: Users,
      active: pathname.startsWith("/instructor"),
    },
  ]

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
          <div className="p-1.5 bg-emerald-600 rounded-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent hidden sm:inline-block">
            UniPlanner
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-emerald-600 px-3 py-2 rounded-md",
                  route.active
                    ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400"
                    : "text-muted-foreground"
                )}
              >
                {route.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button size="sm" className="hidden md:inline-flex bg-emerald-600 hover:bg-emerald-700">
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
