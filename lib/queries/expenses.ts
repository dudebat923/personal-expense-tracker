import "server-only"

import mongoose from "mongoose"
import { connectDB } from "@/lib/db"
import { Expense } from "@/lib/models/Expense"

export type ExpenseRow = {
  id: string
  amountCents: number
  description: string
  categoryId: string
  date: string
}

function toDateString(val: unknown): string {
  if (val instanceof Date) return val.toISOString().split("T")[0]
  return String(val).split("T")[0]
}

export async function getExpenses(userId: string): Promise<ExpenseRow[]> {
  await connectDB()
  const docs = await Expense.find({ userId }).sort({ date: -1 }).lean()
  return docs.map((doc) => ({
    id: doc._id.toString(),
    amountCents: doc.amountCents,
    description: doc.description ?? "",
    categoryId: doc.categoryId.toString(),
    date: toDateString(doc.date),
  }))
}

export type CategorySpend = {
  categoryId: string
  categoryName: string
  totalCents: number
  count: number
}

export type RecentExpenseRow = ExpenseRow & { categoryName: string }

export type MonthlyPoint = {
  label: string
  expenseCents: number
}

export type DailyPoint = {
  label: string
  totalCents: number
}

export type DashboardSummary = {
  thisMonth: {
    totalCents: number
    count: number
    byCategory: CategorySpend[]
  }
  lastMonth: {
    totalCents: number
    count: number
  }
  recentExpenses: RecentExpenseRow[]
  monthlyHistory: MonthlyPoint[]
  dailySpend: DailyPoint[]
}

export async function getExpenseSummary(userId: string): Promise<DashboardSummary> {
  await connectDB()

  const uid = new mongoose.Types.ObjectId(userId)
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const sixMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [thisMonthAgg, lastMonthAgg, monthlyAgg, dailyAgg, recentDocs] = await Promise.all([
    Expense.aggregate([
      { $match: { userId: uid, date: { $gte: thisMonthStart } } },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$categoryId",
          categoryName: { $first: "$category.name" },
          totalCents: { $sum: "$amountCents" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalCents: -1 } },
    ]),

    Expense.aggregate([
      {
        $match: {
          userId: uid,
          date: { $gte: lastMonthStart, $lt: thisMonthStart },
        },
      },
      {
        $group: {
          _id: null,
          totalCents: { $sum: "$amountCents" },
          count: { $sum: 1 },
        },
      },
    ]),

    // Monthly totals for the last 6 months (bar chart)
    Expense.aggregate([
      { $match: { userId: uid, date: { $gte: sixMonthsAgoStart } } },
      {
        $group: {
          _id: { year: { $year: "$date" }, month: { $month: "$date" } },
          totalCents: { $sum: "$amountCents" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),

    // Daily totals for current month (line chart)
    Expense.aggregate([
      { $match: { userId: uid, date: { $gte: thisMonthStart } } },
      {
        $group: {
          _id: { $dayOfMonth: "$date" },
          totalCents: { $sum: "$amountCents" },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    Expense.aggregate([
      { $match: { userId: uid } },
      { $sort: { date: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          amountCents: 1,
          description: 1,
          categoryId: 1,
          categoryName: "$category.name",
          date: 1,
        },
      },
    ]),
  ])

  const thisMonthTotal = thisMonthAgg.reduce(
    (sum: number, r: { totalCents: number }) => sum + r.totalCents,
    0
  )
  const thisMonthCount = thisMonthAgg.reduce(
    (sum: number, r: { count: number }) => sum + r.count,
    0
  )

  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  const monthlyHistory: MonthlyPoint[] = monthlyAgg.map(
    (r: { _id: { year: number; month: number }; totalCents: number }) => ({
      label: `${MONTH_NAMES[r._id.month - 1]} ${r._id.year}`,
      expenseCents: r.totalCents,
    })
  )

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dailyMap = new Map<number, number>(
    dailyAgg.map((r: { _id: number; totalCents: number }) => [r._id, r.totalCents])
  )
  const dailySpend: DailyPoint[] = Array.from({ length: daysInMonth }, (_, i) => ({
    label: String(i + 1),
    totalCents: dailyMap.get(i + 1) ?? 0,
  }))

  return {
    thisMonth: {
      totalCents: thisMonthTotal,
      count: thisMonthCount,
      byCategory: thisMonthAgg.map(
        (r: { _id: mongoose.Types.ObjectId; categoryName: string; totalCents: number; count: number }) => ({
          categoryId: r._id.toString(),
          categoryName: r.categoryName ?? "Other",
          totalCents: r.totalCents,
          count: r.count,
        })
      ),
    },
    lastMonth: {
      totalCents: lastMonthAgg[0]?.totalCents ?? 0,
      count: lastMonthAgg[0]?.count ?? 0,
    },
    monthlyHistory,
    dailySpend,
    recentExpenses: recentDocs.map(
      (doc: {
        _id: mongoose.Types.ObjectId
        amountCents: number
        description?: string
        categoryId: mongoose.Types.ObjectId
        categoryName: string
        date: Date
      }) => ({
        id: doc._id.toString(),
        amountCents: doc.amountCents,
        description: doc.description ?? "",
        categoryId: doc.categoryId.toString(),
        categoryName: doc.categoryName ?? "Other",
        date: toDateString(doc.date),
      })
    ),
  }
}

export async function getExpenseById(
  id: string,
  userId: string
): Promise<ExpenseRow | null> {
  await connectDB()
  const doc = await Expense.findOne({ _id: id, userId }).lean()
  if (!doc) return null
  return {
    id: doc._id.toString(),
    amountCents: doc.amountCents,
    description: doc.description ?? "",
    categoryId: doc.categoryId.toString(),
    date: toDateString(doc.date),
  }
}
