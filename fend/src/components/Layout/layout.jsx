"use client"
import React from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="backdrop-blur-sm bg-background/80 border-b border-border/40 py-4 px-4 md:px-6 sticky top-0 z-10">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <Link href="/" className="flex items-center gap-2 group">
              <svg 
                viewBox="0 0 24 24" 
                className="w-6 h-6 text-primary transition-transform group-hover:scale-110"
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-destructive to-accent">
                Lost & Found
              </h1>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-3">
              <Link href="/found" className="text-muted-foreground hover:text-foreground transition-colors">
                Found Items
              </Link>
              <Link href="/lost" className="text-muted-foreground hover:text-foreground transition-colors">
                Lost Items
              </Link>
            </nav>
            <div className="flex items-center gap-3">
              <Link href="/report-found" passHref>
                <Button size="sm" variant="outline" className="shadow-sm hover:shadow-md transition-shadow">
                  Report Found
                </Button>
              </Link>
              <Link href="/report" passHref>
                <Button size="sm" className="shadow-sm hover:shadow-md transition-shadow">
                  Report Lost
                </Button>
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5 rounded-3xl transform -skew-y-6 blur-3xl" />
          <div className="relative">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="backdrop-blur-sm bg-background/80 border-t border-border/40 py-6 px-6">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Lost &amp; Found Service &copy; {new Date().getFullYear()}
          </p>
          <nav className="flex items-center gap-6">
            <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}