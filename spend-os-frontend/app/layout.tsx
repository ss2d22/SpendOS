import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/providers/wagmi-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arc SpendOS - Programmable Treasury for Cross-Chain USDC",
  description: "Programmable treasury management system built on Arc blockchain with Circle Gateway integration for seamless cross-chain USDC transfers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} antialiased`}>
        <Web3Provider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
