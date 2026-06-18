"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { GraduationCap, BookOpen, LayoutDashboard, CircleUserRound, UserPen, LogOut, Menu, Calendar } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { authService, UserSession } from "@/lib/auth-service"
import { readStoredPlan, readStoredTranscript } from "@/lib/storage"

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserSession | null>(null)
  const [hasPlanData, setHasPlanData] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
      href: "/scheduler",
      label: "Scheduler",
      icon: Calendar,
      active: pathname === "/scheduler",
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
      <div className="container mx-auto h-16 px-3 sm:px-4 flex items-center gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-90">
          <div className="p-1.5 bg-emerald-600 rounded-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <span className="hidden min-[420px]:inline-block text-lg sm:text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            UniPlanner
          </span>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-none">
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

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            {user ? (
              user.isGuest ? (
                <Link href="/get-started" onClick={handleSignOut}>
                  <Button size="sm" className="inline-flex bg-emerald-600 hover:bg-emerald-700 font-semibold px-3">
                    Login
                  </Button>
                </Link>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" className="inline-flex bg-emerald-600 hover:bg-emerald-700 font-semibold items-center gap-1.5 px-3 shadow-sm">
                      <CircleUserRound className="h-4 w-4" />
                      <span className="max-w-[140px] truncate sm:max-w-none">{user.fullName}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 p-2">
                    <div className="px-2 py-2 border-b border-slate-200 dark:border-slate-800">
                      <p className="text-sm font-semibold truncate">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                    </div>
                    <div className="pt-2 space-y-1">
                      <button
                        onClick={() => router.push("/dashboard?tab=profile")}
                        className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-left hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                      >
                        <UserPen className="h-4 w-4 text-indigo-600" />
                        Edit Profile
                      </button>
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

        <div className="ml-auto flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm px-0">
              <SheetHeader className="px-5 pb-4 border-b border-slate-200 dark:border-slate-800 text-left">
                <SheetTitle className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-600 rounded-lg">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                  UniPlanner
                </SheetTitle>
              </SheetHeader>

              <div className="flex h-full flex-col">
                <div className="px-3 py-4 space-y-1">
                  {routes.map((route) => (
                    <Link
                      key={route.href}
                      href={route.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors",
                        route.active
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                          : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-900"
                      )}
                    >
                      <route.icon className="h-4 w-4" />
                      {route.label}
                    </Link>
                  ))}
                </div>

                <div className="mt-auto border-t border-slate-200 dark:border-slate-800 px-3 py-4 space-y-2">
                  {user ? (
                    user.isGuest ? (
                      <Link href="/get-started" onClick={async () => {
                        setMobileMenuOpen(false);
                        await handleSignOut();
                      }}>
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 font-semibold">
                          Login
                        </Button>
                      </Link>
                    ) : (
                      <>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-3">
                          <p className="text-sm font-semibold truncate">{user.fullName}</p>
                          <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2 font-semibold"
                          onClick={() => {
                            setMobileMenuOpen(false)
                            router.push("/dashboard?tab=profile")
                          }}
                        >
                          <UserPen className="h-4 w-4 text-indigo-600" />
                          Edit Profile
                        </Button>
                        <Button
                          variant="destructive"
                          className="w-full justify-start gap-2 font-semibold"
                          onClick={async () => {
                            setMobileMenuOpen(false)
                            await handleSignOut()
                          }}
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </Button>
                      </>
                    )
                  ) : (
                    <Link href="/get-started" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 font-semibold">
                        Get Started
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}
