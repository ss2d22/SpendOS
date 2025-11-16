'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Moon, Sun, TrendingUp, Shield, Zap, Users, Menu, X, ChevronRight } from 'lucide-react';
import { ConnectWalletButton } from '@/components/web3/connect-wallet-button';
import { SignInWithWalletButton } from '@/components/auth/sign-in-with-wallet-button';
import { useUserStore } from '@/lib/store/user';
import { useUIStore } from '@/lib/store/ui';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, user } = useUserStore();
  const { darkMode, toggleDarkMode } = useUIStore();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-background/80 backdrop-blur-lg border-b border-border'
            : 'bg-transparent'
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xl">A</span>
                </div>
                <span className="text-xl font-bold">Arc SpendOS</span>
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <a
                  href="#features"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  How it Works
                </a>
                <Link
                  href="/dashboard"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <div className="hidden md:flex items-center gap-2">
                <ConnectWalletButton />
                <SignInWithWalletButton />
                {isAuthenticated && user && (
                  <Button asChild>
                    <Link href="/dashboard">
                      Dashboard
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                )}
              </div>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-lg">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground">
                Features
              </a>
              <a href="#how-it-works" className="block text-sm text-muted-foreground hover:text-foreground">
                How it Works
              </a>
              <Link href="/dashboard" className="block text-sm text-muted-foreground hover:text-foreground">
                Dashboard
              </Link>
              <div className="pt-3 space-y-2">
                <ConnectWalletButton />
                <SignInWithWalletButton />
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 grid-background opacity-50" aria-hidden="true" />
        <div className="absolute inset-0 radial-glow" aria-hidden="true" />

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            <Badge variant="secondary" className="text-sm">
              Powered by Arc + Circle Gateway
            </Badge>

            {/* Authentication Status Alert - only show if wallet connected but not signed in */}
            {!isAuthenticated && (
              <div className="mx-auto max-w-2xl">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm">
                  <p className="text-blue-500 font-medium mb-2">
                    👋 Getting Started
                  </p>
                  <p className="text-muted-foreground">
                    To access the dashboard: <strong>1.</strong> Connect your wallet above, then <strong>2.</strong> Click "Sign in with wallet" to authenticate
                  </p>
                </div>
              </div>
            )}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              Programmable treasury for cross-chain USDC
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Automate company spending with on-chain policies and cross-chain execution.
              Configure spend accounts, set budgets and limits, and let Arc SpendOS handle the rest.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Button size="lg" asChild className="bg-primary hover:bg-primary/90">
                  <Link href="/dashboard">
                    Open Dashboard
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </Link>
                </Button>
              ) : (
                <>
                  <ConnectWalletButton />
                  <SignInWithWalletButton />
                </>
              )}
              <Button size="lg" variant="outline" asChild>
                <a href="#how-it-works">Learn More</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-bold">Built for modern treasury management</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              On-chain policies, automated execution, and complete transparency
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Zap,
                title: 'Auto-Approval',
                description: 'Requests below threshold are automatically approved and executed.',
              },
              {
                icon: Shield,
                title: 'On-Chain Policies',
                description: 'Budgets, limits, and approvals enforced by smart contracts.',
              },
              {
                icon: Users,
                title: 'Role-Based Access',
                description: 'Admin, Manager, and Spender roles with granular permissions.',
              },
              {
                icon: TrendingUp,
                title: 'Cross-Chain',
                description: 'Send USDC to any supported chain via Circle Gateway.',
              },
            ].map((feature, i) => (
              <Card
                key={i}
                className="p-6 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-bold">How Arc SpendOS works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple workflow for automated treasury management
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Configure Accounts',
                description: 'Admins create spend accounts with budgets, limits, and approval thresholds.',
              },
              {
                step: '2',
                title: 'Request Spends',
                description: 'Spenders request funds. Auto-approved if under threshold, otherwise sent to managers.',
              },
              {
                step: '3',
                title: 'Execute Cross-Chain',
                description: 'Approved spends are executed via Circle Gateway to any supported chain.',
              },
            ].map((item, i) => (
              <Card key={i} className="relative p-6">
                <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  {item.step}
                </div>
                <CardHeader className="p-0 mb-3">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button size="lg" asChild>
              <Link href="/dashboard">Get Started</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Arc SpendOS. Built with Arc + Circle Gateway.
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Docs
              </a>
              <a href="https://github.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
