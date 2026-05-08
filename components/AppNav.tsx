"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  HomeIcon,
  CreditCardIcon,
  TagIcon,
} from "@heroicons/react/24/outline"
import { signOut } from "next-auth/react"

const links = [
  { href: "/dashboard", label: "Dashboard", Icon: HomeIcon },
  { href: "/expenses", label: "Expenses", Icon: CreditCardIcon },
  { href: "/expenses/categories", label: "Categories", Icon: TagIcon },
]

export function AppNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-900 dark:bg-slate-950 z-30">
        <div className="flex flex-col flex-1 overflow-y-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-8 px-2">
            <span className="text-white font-semibold text-lg">
              Expense Tracker
            </span>
          </div>

          <nav className="flex flex-col gap-1 flex-1">
            {links.map(({ href, label, Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/")
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "text-white bg-slate-700 dark:bg-slate-800"
                      : "text-slate-400 hover:text-white hover:bg-slate-700 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              )
            })}
          </nav>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700 dark:hover:bg-slate-800 transition-colors w-full text-left"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex">
        {links.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center py-3 text-xs font-medium gap-1 transition-colors ${
                active
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
