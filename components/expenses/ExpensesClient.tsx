"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline"
import { createExpenseSchema, updateExpenseSchema } from "@/lib/schemas/expense"
import {
  createExpense,
  updateExpense,
  deleteExpense,
} from "@/app/(app)/expenses/_actions"
import type { ExpenseRow } from "@/lib/queries/expenses"
import type { CategoryRow } from "@/lib/queries/categories"

type ModalState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; expense: ExpenseRow }
  | { type: "delete"; expense: ExpenseRow }

const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining":
    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  Transport: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  Housing:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  Entertainment:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Health:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Shopping:
    "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  Utilities:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  Travel: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  Other: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
}

const DEFAULT_BADGE =
  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"

function formatAmount(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

interface Props {
  expenses: ExpenseRow[]
  categories: CategoryRow[]
}

export function ExpensesClient({ expenses, categories }: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<ModalState>({ type: "closed" })
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  })

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

  const todayISO = new Date().toISOString().split("T")[0]

  function clearFormState() {
    setFormError(null)
    setFieldErrors({})
  }

  function openCreate() {
    clearFormState()
    setModal({ type: "create" })
  }

  function openEdit(expense: ExpenseRow) {
    clearFormState()
    setModal({ type: "edit", expense })
  }

  function openDelete(expense: ExpenseRow) {
    setModal({ type: "delete", expense })
  }

  function closeModal() {
    setModal({ type: "closed" })
  }

  function showToast(message: string) {
    setToast({ visible: true, message })
    setTimeout(() => setToast({ visible: false, message: "" }), 3500)
  }

  useEffect(() => {
    if (modal.type === "closed") return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [modal.type])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const rawAmount = formData.get("amount") as string
    const amountCents = Math.round(parseFloat(rawAmount) * 100)

    const input = {
      amountCents,
      description: formData.get("description") as string,
      categoryId: formData.get("categoryId") as string,
      date: formData.get("date") as string,
    }

    const schema =
      modal.type === "edit" ? updateExpenseSchema : createExpenseSchema
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      setFieldErrors(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      )
      return
    }

    clearFormState()

    startTransition(async () => {
      if (modal.type === "create") {
        const result = await createExpense(parsed.data)
        if (!result.success) {
          setFormError(result.error)
          if (result.fieldErrors) setFieldErrors(result.fieldErrors)
          return
        }
        closeModal()
        router.refresh()
        showToast("Expense added.")
      } else if (modal.type === "edit") {
        const result = await updateExpense(modal.expense.id, parsed.data)
        if (!result.success) {
          setFormError(result.error)
          if (result.fieldErrors) setFieldErrors(result.fieldErrors)
          return
        }
        closeModal()
        router.refresh()
        showToast("Expense updated.")
      }
    })
  }

  function handleDelete() {
    if (modal.type !== "delete") return
    const expenseId = modal.expense.id
    const desc = modal.expense.description || "this expense"
    startTransition(async () => {
      const result = await deleteExpense(expenseId)
      closeModal()
      if (!result.success) {
        showToast(result.error)
        return
      }
      router.refresh()
      showToast(`"${desc}" deleted.`)
    })
  }

  const isFormOpen = modal.type === "create" || modal.type === "edit"
  const editingExpense = modal.type === "edit" ? modal.expense : null
  const formKey =
    modal.type === "edit" ? `edit-${modal.expense.id}` : "create"

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Expenses
        </h1>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 active:bg-indigo-800 transition-colors"
        >
          <PlusIcon className="w-4 h-4" aria-hidden="true" />
          Add Expense
        </button>
      </div>

      {/* Content — empty state or data table */}
      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400 text-2xl">
            💸
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            No expenses yet
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-xs">
            Add your first expense to start tracking your spending.
          </p>
          <div className="mt-5">
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 active:bg-indigo-800 transition-colors"
            >
              <PlusIcon className="w-4 h-4" aria-hidden="true" />
              Add Expense
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/70">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="px-4 py-3 w-20">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {expenses.map((expense) => {
                  const catName =
                    categoryMap.get(expense.categoryId) ?? "Other"
                  const badgeColor =
                    CATEGORY_COLORS[catName] ?? DEFAULT_BADGE
                  return (
                    <tr
                      key={expense.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(expense.date)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50 max-w-xs truncate">
                        {expense.description !== "" ? (
                          expense.description
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 italic font-normal">
                            No description
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColor}`}
                        >
                          {catName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-red-600 dark:text-red-400 whitespace-nowrap">
                        -{formatAmount(expense.amountCents)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(expense)}
                            aria-label="Edit expense"
                            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
                          >
                            <PencilSquareIcon
                              className="w-4 h-4"
                              aria-hidden="true"
                            />
                          </button>
                          <button
                            onClick={() => openDelete(expense)}
                            aria-label="Delete expense"
                            className="rounded-lg p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-colors"
                          >
                            <TrashIcon
                              className="w-4 h-4"
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal.type !== "closed" && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-150"
            aria-hidden="true"
          />

          {/* Panel — clicking the empty area around the dialog closes it */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={closeModal}
          >
            <div
              className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >

              {/* ── Create / Edit form ── */}
              {isFormOpen && (
                <>
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <h2
                      id="modal-title"
                      className="text-base font-semibold text-slate-900 dark:text-slate-50"
                    >
                      {modal.type === "create" ? "Add Expense" : "Edit Expense"}
                    </h2>
                    <button
                      onClick={closeModal}
                      aria-label="Close"
                      className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>

                  <form key={formKey} onSubmit={handleSubmit} noValidate>
                    <div className="px-6 py-5 flex flex-col gap-5">
                      {/* Banner error */}
                      {formError !== null && (
                        <div
                          role="alert"
                          className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30"
                        >
                          <p className="text-sm text-red-700 dark:text-red-300">
                            {formError}
                          </p>
                        </div>
                      )}

                      {/* Amount */}
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="amount"
                          className="text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          Amount
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none text-sm">
                            $
                          </span>
                          <input
                            id="amount"
                            name="amount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            defaultValue={
                              editingExpense
                                ? (editingExpense.amountCents / 100).toFixed(2)
                                : ""
                            }
                            aria-describedby={
                              fieldErrors.amountCents
                                ? "amount-error"
                                : undefined
                            }
                            aria-invalid={
                              fieldErrors.amountCents ? "true" : undefined
                            }
                            className={`block w-full rounded-lg border pl-7 pr-3 py-2 text-sm text-slate-900 dark:text-slate-50 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition ${
                              fieldErrors.amountCents
                                ? "border-red-500 focus:ring-red-500"
                                : "border-slate-300 dark:border-slate-600 focus:ring-indigo-600"
                            }`}
                          />
                        </div>
                        {fieldErrors.amountCents && (
                          <p
                            id="amount-error"
                            className="text-xs text-red-600 dark:text-red-400"
                          >
                            {fieldErrors.amountCents[0]}
                          </p>
                        )}
                      </div>

                      {/* Description */}
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="description"
                          className="text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          Description
                        </label>
                        <input
                          id="description"
                          name="description"
                          type="text"
                          placeholder="e.g. Grocery run"
                          defaultValue={editingExpense?.description ?? ""}
                          aria-describedby={
                            fieldErrors.description
                              ? "description-error"
                              : undefined
                          }
                          aria-invalid={
                            fieldErrors.description ? "true" : undefined
                          }
                          className={`block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 dark:text-slate-50 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition ${
                            fieldErrors.description
                              ? "border-red-500 focus:ring-red-500"
                              : "border-slate-300 dark:border-slate-600 focus:ring-indigo-600"
                          }`}
                        />
                        {fieldErrors.description && (
                          <p
                            id="description-error"
                            className="text-xs text-red-600 dark:text-red-400"
                          >
                            {fieldErrors.description[0]}
                          </p>
                        )}
                      </div>

                      {/* Category + Date row */}
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {/* Category */}
                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="categoryId"
                            className="text-sm font-medium text-slate-700 dark:text-slate-300"
                          >
                            Category
                          </label>
                          <select
                            id="categoryId"
                            name="categoryId"
                            defaultValue={editingExpense?.categoryId ?? ""}
                            aria-describedby={
                              fieldErrors.categoryId
                                ? "category-error"
                                : undefined
                            }
                            aria-invalid={
                              fieldErrors.categoryId ? "true" : undefined
                            }
                            className={`block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 dark:text-slate-50 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:border-transparent transition appearance-none ${
                              fieldErrors.categoryId
                                ? "border-red-500 focus:ring-red-500"
                                : "border-slate-300 dark:border-slate-600 focus:ring-indigo-600"
                            }`}
                          >
                            <option value="">Select a category</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                          {fieldErrors.categoryId && (
                            <p
                              id="category-error"
                              className="text-xs text-red-600 dark:text-red-400"
                            >
                              {fieldErrors.categoryId[0]}
                            </p>
                          )}
                        </div>

                        {/* Date */}
                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="date"
                            className="text-sm font-medium text-slate-700 dark:text-slate-300"
                          >
                            Date
                          </label>
                          <input
                            id="date"
                            name="date"
                            type="date"
                            defaultValue={editingExpense?.date ?? todayISO}
                            aria-describedby={
                              fieldErrors.date ? "date-error" : undefined
                            }
                            aria-invalid={
                              fieldErrors.date ? "true" : undefined
                            }
                            className={`block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 dark:text-slate-50 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:border-transparent transition ${
                              fieldErrors.date
                                ? "border-red-500 focus:ring-red-500"
                                : "border-slate-300 dark:border-slate-600 focus:ring-indigo-600"
                            }`}
                          />
                          {fieldErrors.date && (
                            <p
                              id="date-error"
                              className="text-xs text-red-600 dark:text-red-400"
                            >
                              {fieldErrors.date[0]}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 active:bg-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPending
                          ? "Saving…"
                          : modal.type === "create"
                          ? "Add Expense"
                          : "Save Changes"}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* ── Delete confirmation ── */}
              {modal.type === "delete" && (
                <>
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <h2
                      id="modal-title"
                      className="text-base font-semibold text-slate-900 dark:text-slate-50"
                    >
                      Delete Expense
                    </h2>
                    <button
                      onClick={closeModal}
                      aria-label="Close"
                      className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="px-6 py-5">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      Are you sure you want to delete{" "}
                      <span className="font-medium text-slate-900 dark:text-slate-50">
                        &ldquo;
                        {modal.expense.description || "this expense"}
                        &rdquo;
                      </span>
                      ? This action cannot be undone.
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <button
                      onClick={closeModal}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isPending}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast.visible && (
        <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl bg-slate-900 dark:bg-white px-4 py-3 shadow-lg text-sm text-white dark:text-slate-900 max-w-xs">
            <CheckCircleIcon
              className="w-4 h-4 text-emerald-400 dark:text-emerald-600 flex-shrink-0"
              aria-hidden="true"
            />
            <p className="flex-1">{toast.message}</p>
          </div>
        </div>
      )}
    </>
  )
}
