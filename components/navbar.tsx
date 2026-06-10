"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { GraduationCap, BookOpen, FileText, LayoutDashboard, UserCheck, UserPen, LogOut } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { authService, UserSession } from "@/lib/auth-service"
import { readStoredPlan, readStoredTranscript } from "@/lib/storage"

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserSession | null>(null)
  const [hasPlanData, setHasPlanData] = useState(false)

  useEffect(() => {
    // Perform checking only on client side to avoid hydration mismatch
    const currentUser = authService.getCurrentUser()
    setUser(currentUser)
    
    const planData = readStoredPlan()
    const transcriptData = readStoredTranscript()
    setHasPlanData(!!(planData || transcriptData))

    // Listen for custom storage events or simple intervals to keep in sync
    const handleStorageChange = () => {
      setUser(authService.getCurrentUser())
      setHasPlanData(!!(readStoredPlan() || readStoredTranscript()))
    }
    window.addEventListener("storage", handleStorageChange)
    const interval = setInterval(handleStorageChange, 2000)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  const routes = [
    {
      href: "/courses",
      label: "Courses",
      icon: BookOpen,
      active: pathname === "/courses",
    },
    {
      href: "/transcript",
      label: "Transcript",
      icon: FileText,
      active: pathname === "/transcript",
    },
  ]

  // Add Dashboard link dynamically
  if (user || hasPlanData) {
    routes.push({
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    })
  }

  const handleSignOut = async () => {
    await authService.signOut()
    setUser(null)
    setHasPlanData(false)
    router.push("/get-started")
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:h-16 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
          <div className="p-1.5 bg-emerald-600 rounded-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            UniPlanner
          </span>
        </Link>

        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "shrink-0 text-xs sm:text-sm font-medium transition-colors hover:text-emerald-600 px-2.5 sm:px-3 py-2 rounded-md whitespace-nowrap",
                  route.active
                    ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400"
                    : "text-muted-foreground"
                )}
              >
                {route.label}
              </Link>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
            <ThemeToggle />
            {user ? (
              user.isGuest ? (
                <Link href="/get-started">
                  <Button size="sm" className="inline-flex bg-emerald-600 hover:bg-emerald-700 font-semibold px-3">
                    Login
                  </Button>
                </Link>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" className="inline-flex bg-indigo-600 hover:bg-indigo-700 font-semibold items-center gap-1.5 px-3">
                      <UserCheck className="h-4 w-4" />
                      {user.fullName.split(" ")[0]}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 p-2">
                    <div className="px-2 py-2 border-b border-slate-200 dark:border-slate-800">
                      <p className="text-sm font-semibold truncate">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                    </div>
                    <div className="pt-2 space-y-1">
                      <Link href="/dashboard?tab=profile">
                        <button className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-left hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                          <UserPen className="h-4 w-4 text-indigo-600" />
                          Edit Profile
                        </button>
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-left text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              )
            ) : (
              <Link href="/get-started">
                <Button size="sm" className="inline-flex bg-emerald-600 hover:bg-emerald-700 font-semibold px-3">
                  Get Started
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
