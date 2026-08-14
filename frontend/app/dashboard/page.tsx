"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Form {
  id: number;
  title: string;
  description: string;
  status: string;
  response_count: number;
}

interface ModalAlert {
  title: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

export default function Dashboard() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Modal State
  const [deletingForm, setDeletingForm] = useState<Form | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Card Alert Modal State (replaces all browser alerts)
  const [modalAlert, setModalAlert] = useState<ModalAlert | null>(null);

  const showAlert = (
    message: string,
    type: "success" | "error" | "info" | "warning" = "info",
    title?: string
  ) => {
    const defaultTitle =
      type === "error"
        ? "Error"
        : type === "success"
        ? "Success"
        : type === "warning"
        ? "Warning"
        : "Notice";
    setModalAlert({
      title: title || defaultTitle,
      message,
      type,
    });
  };

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/forms/`)
      .then((response) => response.json())
      .then((data) => {
        setForms(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching forms:", error);
        showAlert(
          "Could not connect to backend server. Please check your API URL.",
          "error"
        );
        setLoading(false);
      });
  }, []);

  // Create Form
  async function createForm() {
    if (title.trim() === "") {
      showAlert("Please enter a form title before saving.", "warning", "Missing Title");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/forms/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
          }),
        }
      );

      if (!response.ok) {
        let errDetail = "Failed to create form.";
        try {
          const errorData = await response.json();
          if (errorData.detail) errDetail = errorData.detail;
          else if (typeof errorData === "object") {
            errDetail = Object.entries(errorData)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
              .join(" | ");
          }
        } catch {}
        showAlert(errDetail, "error", "Creation Failed");
        return;
      }

      const newForm = await response.json();
      setForms((prev) => [...prev, newForm]);
      setTitle("");
      setDescription("");
      setShowForm(false);
      showAlert("Your new form has been created successfully!", "success", "Form Created");
    } catch (error) {
      console.error("Error creating form:", error);
      showAlert("Could not connect to the server. Please verify your connection.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Open Edit Modal
  function openEditModal(form: Form) {
    setEditingForm(form);
    setEditTitle(form.title || "");
    setEditDescription(form.description || "");
  }

  // Close Edit Modal
  function closeEditModal() {
    setEditingForm(null);
    setEditTitle("");
    setEditDescription("");
  }

  // Save Edited Form
  async function handleSaveEdit() {
    if (!editingForm) return;

    if (editTitle.trim() === "") {
      showAlert("Title cannot be empty.", "warning", "Validation Error");
      return;
    }

    try {
      setIsUpdating(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/forms/${editingForm.id}/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: editTitle.trim(),
            description: editDescription.trim(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update form.");
      }

      const updatedForm = await response.json();

      setForms((prev) =>
        prev.map((f) => (f.id === editingForm.id ? updatedForm : f))
      );

      closeEditModal();
      showAlert("Form details updated successfully!", "success", "Form Updated");
    } catch (error) {
      console.error("Error updating form:", error);
      showAlert("Could not update form. Please try again.", "error");
    } finally {
      setIsUpdating(false);
    }
  }

  // Open Delete Modal
  function openDeleteModal(form: Form) {
    setDeletingForm(form);
  }

  // Confirm Delete Form
  async function handleConfirmDelete() {
    if (!deletingForm) return;

    try {
      setIsDeleting(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/forms/${deletingForm.id}/`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete form.");
      }

      setForms((prev) => prev.filter((form) => form.id !== deletingForm.id));
      setDeletingForm(null);
      showAlert("Form and all associated responses deleted.", "success", "Form Deleted");
    } catch (error) {
      console.error("Error deleting form:", error);
      showAlert("Could not delete form. Please try again.", "error");
    } finally {
      setIsDeleting(false);
    }
  }

  // Duplicate Form
  async function duplicateForm(formId: number) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/forms/${formId}/duplicate/`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to duplicate form.");
      }

      const newForm = await response.json();
      setForms((prev) => [...prev, newForm]);
      showAlert("Form has been cloned as a draft copy.", "success", "Form Duplicated");
    } catch (error) {
      console.error("Error duplicating form:", error);
      showAlert("Could not duplicate form.", "error");
    }
  }

  // Publish form
  async function publishForm(formId: number) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/forms/${formId}/publish/`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to publish form.");
      }

      const updatedForm = await response.json();

      setForms(
        forms.map((form) =>
          form.id === formId ? updatedForm : form
        )
      );
      showAlert("Form is now public and accepting responses!", "success", "Form Published");
    } catch (error) {
      console.error("Error publishing form:", error);
      showAlert("Could not publish form.", "error");
    }
  }

  // Unpublish form
  async function unpublishForm(formId: number) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/forms/${formId}/unpublish/`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to unpublish form.");
      }

      const updatedForm = await response.json();

      setForms(
        forms.map((form) =>
          form.id === formId ? updatedForm : form
        )
      );
      showAlert("Form is now draft and hidden from the public.", "info", "Form Unpublished");
    } catch (error) {
      console.error("Error unpublishing form:", error);
      showAlert("Could not unpublish form.", "error");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              My Forms
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create, view, and manage your custom forms and responses.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"}
              />
            </svg>
            {showForm ? "Close Form" : "Create Form"}
          </button>
        </div>

        {/* Create Form Card Section */}
        {showForm && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Create New Form
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fill in the details below to add a new form.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Form Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Student Feedback Form"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide a brief summary of what this form is for..."
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={createForm}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    "Save Form"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Forms List */}
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
              Loading your forms...
            </div>
          ) : forms.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="mt-3 text-base font-semibold text-slate-900">
                No forms yet
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Get started by creating your very first form.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition shadow-sm"
              >
                + Create Form
              </button>
            </div>
          ) : (
            forms.map((form) => {
              const isPublished =
                form.status?.toLowerCase() === "published";

              return (
                <div
                  key={form.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-lg font-semibold text-slate-900">
                          {form.title}
                        </h2>

                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                            isPublished
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {form.status || "draft"}
                        </span>
                      </div>

                      {form.description && (
                        <p className="mt-1 text-sm text-slate-600">
                          {form.description}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-start">
                      <button
                        onClick={() => openEditModal(form)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 active:scale-95"
                        title="Edit Form"
                      >
                        <svg className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Edit
                      </button>

                      <Link
                        href={`/forms/${form.id}/builder`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800 active:scale-95"
                        title="Open Form Builder"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                        Build
                      </Link>

                      <button
                        onClick={() => duplicateForm(form.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 active:scale-95"
                        title="Duplicate Form"
                      >
                        <svg className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                        Duplicate
                      </button>

                      {form.status === "published" ? (
                        <button
                          onClick={() => unpublishForm(form.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm transition hover:bg-amber-50 hover:border-amber-300 active:scale-95"
                          title="Unpublish Form"
                        >
                          <svg className="h-3.5 w-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                          </svg>
                          Unpublish
                        </button>
                      ) : (
                        <button
                          onClick={() => publishForm(form.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-50 hover:border-emerald-300 active:scale-95"
                          title="Publish Form"
                        >
                          <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                          </svg>
                          Publish
                        </button>
                      )}

                      {form.status === "published" && (
                        <Link
                          href={`/forms/${form.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm transition hover:bg-blue-50 hover:border-blue-300 active:scale-95"
                          title="Open Form in this tab"
                        >
                          <svg className="h-3.5 w-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                          </svg>
                          Open Form
                        </Link>
                      )}

                      <button
                        onClick={() => openDeleteModal(form)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm transition hover:bg-red-50 hover:border-red-300 active:scale-95"
                        title="Delete Form"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Card Footer info */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <Link
                      href={`/forms/${form.id}/responses`}
                      className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-slate-950 transition hover:underline"
                      title="View all submitted responses"
                    >
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      {form.response_count}{" "}
                      {form.response_count === 1 ? "Response" : "Responses"} &rarr;
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* =========================================
          EDIT FORM POPUP CARD (MODAL)
         ========================================= */}
      {editingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10 transition-all sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Edit Form</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your form title and description.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content / Inputs */}
            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Form Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Enter form title..."
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Provide a brief summary of what this form is for..."
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={isUpdating}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isUpdating}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
              >
                {isUpdating ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          DELETE FORM CONFIRMATION CARD (MODAL)
         ========================================= */}
      {deletingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10 transition-all sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-100">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">Delete Form</h3>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold text-slate-900">"{deletingForm.title}"</span>? This will permanently delete the form and all its submitted responses.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setDeletingForm(null)}
                disabled={isDeleting}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete Form"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          POPUP ALERT CARD (MODAL REPLACING ALERT)
         ========================================= */}
      {modalAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10 text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
                modalAlert.type === "success"
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  : modalAlert.type === "error"
                  ? "bg-red-50 text-red-600 border border-red-100"
                  : modalAlert.type === "warning"
                  ? "bg-amber-50 text-amber-600 border border-amber-100"
                  : "bg-blue-50 text-blue-600 border border-blue-100"
              }`}
            >
              {modalAlert.type === "success" && (
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {modalAlert.type === "error" && (
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {modalAlert.type === "warning" && (
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {modalAlert.type === "info" && (
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>

            <h3 className="text-lg font-bold text-slate-900">{modalAlert.title}</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{modalAlert.message}</p>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => setModalAlert(null)}
                className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition active:scale-98"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}