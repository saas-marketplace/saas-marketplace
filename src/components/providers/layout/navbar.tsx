"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Menu,
  X,
  ShoppingCart,
  Sun,
  Moon,
  User,
  LogOut,
  Sparkles,
} from "lucide-react";
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Badge } from "../../ui/badge";
import { cn } from "../../../lib/utils";
import { useCart } from "@/stores/cart-context";
import { useAuth } from "../auth-provider";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/freelancers", label: "Freelancers" },
  { href: "/testimonials", label: "Clients" },
  { href: "/contact", label: "Contact" },
];

function NavbarContent() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { cartCount } = useCart();
  const { user, loading, signOut } = useAuth();
  const userRole = user?.role || 'user'; // Get actual role from auth provider

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get theme with mounted check to prevent hydration mismatch
  const effectiveTheme = mounted ? theme : "light";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when pathname changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);



  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
      <motion.header
        initial={{ y: 0, opacity: 1 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className={cn(
          "fixed inset-x-0 top-0 z-50 w-full transition-all duration-300",
          scrolled
            ? "bg-white dark:bg-neutral-900 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 shadow-lg"
            : "bg-white dark:bg-neutral-900"
        )}
      >
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
              className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center"
            >
              <Sparkles className="w-4 h-4 text-white" />
              
            </motion.div>
          </Link>

          {/* Desktop Navigation - Hidden on mobile, visible on md and above */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "text-black dark:text-white"
                    : "text-gray-600 dark:text-gray-300 hover:text-cyan-500 dark:hover:text-cyan-400"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Section - Desktop */}
          <div className="hidden md:flex items-center gap-4">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(effectiveTheme === "dark" ? "light" : "dark")}
              className="rounded-full text-black dark:text-white"
            >
              {effectiveTheme === "dark" ? (
                <Sun className="h-5 w-5 transition-transform" />
              ) : (
                <Moon className="h-5 w-5 transition-transform" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Cart */}
            <Link href="/marketplace/cart">
              <Button variant="ghost" size="icon" className="rounded-full relative text-black dark:text-white">
                <ShoppingCart className="h-5 w-5" />
                {mounted && cartCount > 0 && (
                  <Badge 
                    suppressHydrationWarning 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* User Menu / Auth Buttons */}
            {!loading && (
              user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    {userRole === 'admin' || userRole === 'super_admin' ? (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard">Dashboard</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/settings/profile">Profile</Link>
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                      <DropdownMenuItem asChild>
                        <Link href="/profile">Profile</Link>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem asChild>
                        <Link href="/requests">My Requests</Link>
                      </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { signOut(); setMenuOpen(false); }}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/auth/login">
                    <Button variant="ghost" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button
                      size="sm"
                      className="gradient-bg text-white border-0 hover:opacity-90"
                    >
                      Get Started
                    </Button>
                  </Link>
                </div>
              )
            )}
          </div>

          {/* Mobile Right Section - Visible on screens smaller than md */}
          <div className="flex md:hidden items-center gap-1">
            {/* Cart - Visible on mobile */}
            <Link href="/marketplace/cart">
              <Button variant="ghost" size="icon" className="rounded-full relative text-black dark:text-white">
                <ShoppingCart className="h-5 w-5" />
                {mounted && cartCount > 0 && (
                  <Badge 
                    suppressHydrationWarning 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* Theme Toggle - Visible on mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(effectiveTheme === "dark" ? "light" : "dark")}
              className="rounded-full text-black dark:text-white"
            >
              {effectiveTheme === "dark" ? (
                <Sun className="h-5 w-5 transition-transform" />
              ) : (
                <Moon className="h-5 w-5 transition-transform" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Get Started Button - Only visible when NOT logged in */}
            {!loading && !user && (
              <Link href="/auth/signup">
                <Button
                  size="sm"
                  className="gradient-bg text-white border-0 hover:opacity-90 text-xs px-3"
                >
                  Get Started
                </Button>
              </Link>
            )}

            {/* Hamburger Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition text-black dark:text-white"
            >
              {menuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 w-full bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-white/10 shadow-md z-50"
            >
              <div className="flex flex-col">
                {/* Mobile Navigation Links */}
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "block px-6 py-4 transition-colors",
                      pathname === link.href
                        ? "text-black dark:text-white bg-cyan-50 dark:bg-white/5"
                        : "text-gray-600 dark:text-gray-300 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-gray-50 dark:hover:bg-white/5"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                
                <div className="border-t border-gray-200 dark:border-white/10" />
                
                {/* Sign In - Only show if not logged in */}
                {!loading && !user && (
                  <Link
                    href="/auth/login"
                    onClick={() => setMenuOpen(false)}
                    className="block px-6 py-4 text-gray-600 dark:text-gray-300 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Sign In
                  </Link>
                )}
          {/* User Dashboard Link - Only show if logged in */}
          {!loading && user && (
              <>
                {(userRole === 'admin' || userRole === 'super_admin') && (
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="block px-6 py-4 text-gray-600 dark:text-gray-300 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Dashboard
                  </Link>
                )}

          {/* Non-admin users can have their normal links here */}
          {!(userRole === 'admin' || userRole === 'super_admin') && (
            <>
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="block px-6 py-4 text-gray-600 dark:text-gray-300 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Profile
              </Link>
              <Link
                href="/requests"
                onClick={() => setMenuOpen(false)}
                className="block px-6 py-4 text-gray-600 dark:text-gray-300 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                My Requests
              </Link>
            </>
          )}

          <button
            onClick={() => { signOut(); setMenuOpen(false); }}
            className="block px-6 py-4 text-gray-600 dark:text-gray-300 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left w-full"
          >
            Sign Out
          </button>
        </>
      )}
               
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}

export function Navbar() {
  return (
    <Suspense fallback={null}>
      <NavbarContent />
    </Suspense>
  );
}
