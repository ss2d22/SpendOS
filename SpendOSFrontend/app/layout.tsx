import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from '@/components/shadcn-studio/blocks/hero-section-01/header'
import type { NavigationSection } from '@/components/shadcn-studio/blocks/hero-section-01/header'
import './globals.css'
import { ThemeProvider } from "@/components/theme-provider"

const navigationData: NavigationSection[] = [
  { title: 'Home', href: '/' },
  { title: 'How it works', href: '/#how-it-works' },
  { title: 'Get Started', href: '/#get-started' }
]


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SpendOS",
  description: "Your Gateway to Seamless Treasury Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            >
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">
            <Header navigationData={navigationData} />
              {children}
          </main>
        </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
