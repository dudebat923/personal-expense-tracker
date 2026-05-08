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
import { createCategorySchema, updateCategorySchema } from "@/lib/schemas/category"
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/app/(app)/expenses/categories/_actions"
import type { CategoryRow } from "@/lib/queries/categories"

type ModalState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; category: CategoryRow }
  | { type: "delete"; category: CategoryRow }

interface Props {
  categories: CategoryRow[]
}

export function CategoriesClient({ categories }: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<ModalState>({ type: "closed" })
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  })

  const defaultCategories = categories.filter((c) => c.isDefault)
  const userCategories = categories.filter((c) => !c.isDefault)

  function clearFormState() {
    setFormError(null)
    setFieldErrors({})
  }

  function openCreate() {
    clearFormState()
    setModal({ type: "create" })
  }

  function openEdit(category: CategoryRow) {
    clearFormState()
    setModal({ type: "edit", category })
  }

  function openDelete(category: CategoryRow) {
    setModal({ type: "delete", category })
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
    const input = { name: formData.get("name") as string }

    const schema = modal.type === "edit" ? updateCategorySchema : createCategorySchema
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>)
      return
    }

    clearFormState()

    startTransition(async () => {
      if (modal.type === "create") {
        const result = await createCategory(parsed.data)
        if (!result.success) {
          setFormError(result.error)
          if (result.fieldErrors) setFieldErrors(result.fieldErrors)
          return
        }
        closeModal()
        router.refresh()
        showToast("Category created.")
      } else if (modal.type === "edit") {
        const result = await updateCategory(modal.category.id, parsed.data)
        if (!result.success) {
          setFormError(result.error)
          if (result.fieldErrors) setFieldErrors(result.fieldErrors)
          return
        }
        closeModal()
        router.refresh()
        showToast("Category updated.")
      }
    })
  }

  function handleDelete() {
    if (modal.type !== "delete") return
    const categoryId = modal.category.id
    const name = modal.category.name
    startTransition(async () => {
      const result = await deleteCategory(categoryId)
      if (!result.success) {
        closeModal()
        showToast(result.error)
        return
      }
      closeModal()
      router.refresh()
      showToast(`"${name}" deleted.`)
    })
  }

  const editingCategory = modal.type === "edit" ? modal.category : null
  const formKey = modal.type === "edit" ? `edit-${modal.category.id}` : "create"

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Categories
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage your expense categories. Default categories cannot be edited.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 active:bg-indigo-800 transition-colors"
        >
          <PlusIcon className="w-4 h-4" aria-hidden="true" />
          New Category
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {/* User categories */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-medium text-slate-900 dark:text-slate-50">
              Your categories
            </h2>
          </div>
          {userCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400 text-xl">
                🏷️
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                No custom categories yet
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                Create a category to group your expenses your way.
              </p>
              <button
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 active:bg-indigo-800 transition-colors"
              >
                <PlusIcon className="w-4 h-4" aria-hidden="true" />
                New Category
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {userCategories.map((cat) => (
                <li
                  key={cat.id}
                  className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                    {cat.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(cat)}
                      aria-label={`Edit ${cat.name}`}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
                    >
                      <PencilSquareIcon className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => openDelete(cat)}
                      aria-label={`Delete ${cat.name}`}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Default categories */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-medium text-slate-900 dark:text-slate-50">
              Default categories
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Read-only
            </span>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {defaultCategories.map((cat) => (
              <li
                key={cat.id}
                className="flex items-center justify-between px-6 py-3"
              >
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {cat.name}
                </span>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Default
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Modal */}
      {modal.type !== "closed" && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-150"
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={closeModal}
          >
            <div
              className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Create / Edit form */}
              {(modal.type === "create" || modal.type === "edit") && (
                <>
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <h2
                      id="modal-title"
                      className="text-base font-semibold text-slate-900 dark:text-slate-50"
                    >
                      {modal.type === "create" ? "New Category" : "Rename Category"}
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

                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="name"
                          className="text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          Category name
                        </label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          placeholder="e.g. Subscriptions"
                          defaultValue={editingCategory?.name ?? ""}
                          autoFocus
                          aria-describedby={fieldErrors.name ? "name-error" : undefined}
                          aria-invalid={fieldErrors.name ? "true" : undefined}
                          className={`block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 dark:text-slate-50 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition ${
                            fieldErrors.name
                              ? "border-red-500 focus:ring-red-500"
                              : "border-slate-300 dark:border-slate-600 focus:ring-indigo-600"
                          }`}
                        />
                        {fieldErrors.name && (
                          <p
                            id="name-error"
                            className="text-xs text-red-600 dark:text-red-400"
                          >
                            {fieldErrors.name[0]}
                          </p>
                        )}
                      </div>
                    </div>

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
                          ? "Create"
                          : "Save"}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* Delete confirmation */}
              {modal.type === "delete" && (
                <>
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <h2
                      id="modal-title"
                      className="text-base font-semibold text-slate-900 dark:text-slate-50"
                    >
                      Delete Category
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
                        &ldquo;{modal.category.name}&rdquo;
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
