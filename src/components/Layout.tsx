"use client";

import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type LayoutProps = {
  children: ReactNode;
};

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Lexeme Master</h1>
          </div>

          {/* Navigation */}
          <HeaderNav />

          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
};

const HeaderNav = () => {
  const pathname = usePathname();
  const navClass = (href: string) =>
    cn(
      "text-sm font-medium transition-colors hover:text-foreground",
      pathname === href ? "text-foreground" : "text-foreground/60"
    );

  return (
    <nav className="hidden items-center gap-6 sm:flex">
      <Link href="/" className={navClass("/")}>
        Practice
      </Link>
      <Link href="/words" className={navClass("/words")}>
        Words
      </Link>
    </nav>
  );
};
