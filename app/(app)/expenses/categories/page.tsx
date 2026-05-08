import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getCategories } from "@/lib/queries/categories"
import { CategoriesClient } from "@/components/categories/CategoriesClient"

export default async function CategoriesPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const categories = await getCategories(session.user.id)

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
      <CategoriesClient categories={categories} />
    </div>
  )
}
