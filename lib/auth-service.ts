import { supabase, isSupabaseConfigured } from "./supabase"
import { clearStoredAcademicData } from "./storage"

export interface UserSession {
    id?: string
    username: string
    fullName: string
    isGuest?: boolean
}

const LOCAL_STORAGE_USERS_KEY = "uniplanner_mock_users"
const LOCAL_STORAGE_SESSION_KEY = "uniplanner_current_session"

function setCurrentSession(userSession: UserSession | null) {
    if (typeof window === "undefined") return

    if (!userSession) {
        localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY)
        return
    }

    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(userSession))
}

function getMockUsers(): Record<string, { fullName: string; passwordHash: string }> {
    if (typeof window === "undefined") return {}
    try {
        const data = localStorage.getItem(LOCAL_STORAGE_USERS_KEY)
        return data ? JSON.parse(data) : {}
    } catch {
        return {}
    }
}

function saveMockUser(username: string, fullName: string, passwordHash: string) {
    if (typeof window === "undefined") return
    try {
        const users = getMockUsers()
        users[username.toLowerCase()] = { fullName, passwordHash }
        localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users))
    } catch (e) {
        console.error("Failed to save mock user", e)
    }
}

function updateMockUser(
    currentUsername: string,
    nextUsername: string,
    fullName: string
): { success: boolean; error?: string } {
    if (typeof window === "undefined") return { success: false, error: "Profile updates require a browser session" }

    try {
        const users = getMockUsers()
        const currentKey = currentUsername.trim().toLowerCase()
        const nextKey = nextUsername.trim().toLowerCase()
        const currentUser = users[currentKey]

        if (!currentUser) {
            return { success: false, error: "Current account was not found" }
        }

        if (currentKey !== nextKey && users[nextKey]) {
            return { success: false, error: "Username already exists" }
        }

        delete users[currentKey]
        users[nextKey] = {
            fullName,
            passwordHash: currentUser.passwordHash
        }

        localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users))
        return { success: true }
    } catch (error) {
        console.error("Failed to update mock user", error)
        return { success: false, error: "Failed to update profile" }
    }
}

export const authService = {
    async signUp(fullName: string, username: string, passwordHash: string): Promise<{ success: boolean; error?: string; user?: UserSession }> {
        const cleanUsername = username.trim().toLowerCase()
        if (!fullName.trim() || !cleanUsername || !passwordHash) {
            return { success: false, error: "All fields are required" }
        }

        if (isSupabaseConfigured && supabase) {
            try {
                // Ensure table exists on every signup
                await supabase.rpc('create_profiles_table')

                // Map username to a valid-looking email for Supabase GoTrue Auth
                const email = `${cleanUsername}@uniplanner.local`
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password: passwordHash,
                    options: {
                        data: {
                            full_name: fullName,
                            username: username,
                        },
                    },
                })

                if (error) {
                    return { success: false, error: error.message }
                }

                if (data.user) {
                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert({
                            id: data.user.id,
                            username: username,
                            full_name: fullName
                        })
                    if (insertError) {
                        console.error("Failed to insert profile:", insertError)
                        return { success: false, error: insertError.message }
                    }
                }

                const userSession = {
                    id: data.user?.id,
                    username,
                    fullName,
                }
                
                // Store in local storage for session durability
                if (typeof window !== "undefined") {
                    setCurrentSession(userSession)
                }

                return { success: true, user: userSession }
            } catch (err) {
                return { success: false, error: err instanceof Error ? err.message : "Supabase signup failed" }
            }
        } else {
            // Mock Fallback
            const users = getMockUsers()
            if (users[cleanUsername]) {
                return { success: false, error: "Username already exists" }
            }

            saveMockUser(cleanUsername, fullName, passwordHash)
            
            const userSession = {
                username,
                fullName,
            }
            
            if (typeof window !== "undefined") {
                setCurrentSession(userSession)
            }

            return { success: true, user: userSession }
        }
    },

    async signIn(username: string, passwordHash: string): Promise<{ success: boolean; error?: string; user?: UserSession }> {
        const cleanUsername = username.trim().toLowerCase()
        if (!cleanUsername || !passwordHash) {
            return { success: false, error: "Username and password are required" }
        }

        if (isSupabaseConfigured && supabase) {
            try {
                const email = `${cleanUsername}@uniplanner.local`
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password: passwordHash,
                })

                if (error) {
                    return { success: false, error: error.message }
                }

                const userSession = {
                    id: data.user?.id,
                    username: data.user?.user_metadata?.username || username,
                    fullName: data.user?.user_metadata?.full_name || username,
                }

                if (typeof window !== "undefined") {
                    setCurrentSession(userSession)
                }

                return { success: true, user: userSession }
            } catch (err) {
                return { success: false, error: err instanceof Error ? err.message : "Supabase signin failed" }
            }
        } else {
            // Mock Fallback
            const users = getMockUsers()
            const user = users[cleanUsername]
            if (!user || user.passwordHash !== passwordHash) {
                return { success: false, error: "Invalid username or password" }
            }

            const userSession = {
                username: cleanUsername,
                fullName: user.fullName,
            }

            if (typeof window !== "undefined") {
                setCurrentSession(userSession)
            }

            return { success: true, user: userSession }
        }
    },

    async continueAsGuest(): Promise<UserSession> {
        const userSession: UserSession = {
            username: "guest",
            fullName: "Guest Student",
            isGuest: true,
        }

        if (typeof window !== "undefined") {
            setCurrentSession(userSession)
        }

        return userSession
    },

    async updateProfile(fullName: string, username: string): Promise<{ success: boolean; error?: string; user?: UserSession }> {
        const currentUser = this.getCurrentUser()
        const trimmedName = fullName.trim()
        const trimmedUsername = username.trim()
        const cleanUsername = trimmedUsername.toLowerCase()

        if (!currentUser) {
            return { success: false, error: "No active session found" }
        }

        if (!trimmedName || !trimmedUsername) {
            return { success: false, error: "Full name and username are required" }
        }

        if (currentUser.isGuest) {
            const guestSession: UserSession = {
                ...currentUser,
                fullName: trimmedName,
                username: trimmedUsername
            }
            setCurrentSession(guestSession)
            return { success: true, user: guestSession }
        }

        if (isSupabaseConfigured && supabase && currentUser.id) {
            try {
                const { data: existingUser, error: existingError } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("username", trimmedUsername)
                    .neq("id", currentUser.id)
                    .maybeSingle()

                if (existingError) {
                    return { success: false, error: existingError.message }
                }

                if (existingUser) {
                    return { success: false, error: "Username already exists" }
                }

                const nextEmail = `${cleanUsername}@uniplanner.local`
                const { error: authError } = await supabase.auth.updateUser({
                    email: nextEmail,
                    data: {
                        full_name: trimmedName,
                        username: trimmedUsername,
                    },
                })

                if (authError) {
                    return { success: false, error: authError.message }
                }

                const { error: profileError } = await supabase
                    .from("profiles")
                    .update({
                        full_name: trimmedName,
                        username: trimmedUsername,
                    })
                    .eq("id", currentUser.id)

                if (profileError) {
                    return { success: false, error: profileError.message }
                }

                const updatedUser: UserSession = {
                    ...currentUser,
                    fullName: trimmedName,
                    username: trimmedUsername,
                }

                setCurrentSession(updatedUser)
                return { success: true, user: updatedUser }
            } catch (error) {
                return { success: false, error: error instanceof Error ? error.message : "Failed to update profile" }
            }
        }

        const mockUpdate = updateMockUser(currentUser.username, trimmedUsername, trimmedName)
        if (!mockUpdate.success) {
            return { success: false, error: mockUpdate.error }
        }

        const updatedUser: UserSession = {
            ...currentUser,
            fullName: trimmedName,
            username: trimmedUsername,
        }

        setCurrentSession(updatedUser)
        return { success: true, user: updatedUser }
    },

    async signOut(): Promise<void> {
        if (isSupabaseConfigured && supabase) {
            await supabase.auth.signOut()
        }
        if (typeof window !== "undefined") {
            setCurrentSession(null)
            clearStoredAcademicData()
        }
    },

    clearSession(): void {
        setCurrentSession(null)
    },

    getCurrentUser(): UserSession | null {
        if (typeof window === "undefined") return null
        try {
            const data = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY)
            return data ? JSON.parse(data) : null
        } catch {
            return null
        }
    }
}
