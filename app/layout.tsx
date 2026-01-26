import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
    title: "UniPlanner",
    description: "Bahrain University Course Planner",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="antialiased min-h-screen bg-background font-sans text-foreground">
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
