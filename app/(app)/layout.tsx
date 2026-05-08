import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { AppNav } from "@/components/AppNav"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <AppNav />
      {/* Offset content for fixed sidebar on desktop; pad bottom for mobile nav */}
      <div className="md:pl-64 pb-16 md:pb-0">
        <main>{children}</main>
      </div>
    </div>
  )
}
