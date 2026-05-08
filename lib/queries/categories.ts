import "server-only"

import { connectDB } from "@/lib/db"
import { Category } from "@/lib/models/Category"

export type CategoryRow = {
  id: string
  name: string
}

const DEFAULT_CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Housing",
  "Entertainment",
  "Health",
  "Shopping",
  "Utilities",
  "Travel",
  "Other",
]

export async function getCategories(userId: string): Promise<CategoryRow[]> {
  await connectDB()

  const defaultCount = await Category.countDocuments({ isDefault: true })
  if (defaultCount === 0) {
    await Category.insertMany(
      DEFAULT_CATEGORIES.map((name) => ({ name, isDefault: true, userId: null }))
    )
  }

  const [defaultCats, userCats] = await Promise.all([
    Category.find({ isDefault: true }).lean(),
    Category.find({ userId }).lean(),
  ])

  return [...defaultCats, ...userCats].map((doc) => ({
    id: doc._id.toString(),
    name: doc.name,
  }))
}
