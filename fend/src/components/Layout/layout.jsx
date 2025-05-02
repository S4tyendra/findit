"use client"
import React from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-card border-b py-3 px-4 md:px-6 sticky top-0 z-10">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Lost &amp; Found</h1>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/report-found" passHref>
              <Button size="sm">Report Found Item</Button>
            </Link>
            <Link href="/report" passHref>
              <Button size="sm">Report Lost Item</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer - Optional */}
      <footer className="bg-card border-t py-4 px-6">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>Lost &amp; Found Service &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}