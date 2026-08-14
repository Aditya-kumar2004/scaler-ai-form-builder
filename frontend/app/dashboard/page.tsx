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

export default function Dashboard() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/forms/`)
      .then((response) => response.json())
      .then((data) => {
        setForms(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching forms:", error);
        setLoading(false);
      });
  }, []);

  // Create Form
  async function createForm() {
    if (title.trim() === "") {
      alert("Please enter a form title.");
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
            title: title,
            description: description,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.log("Django error:", errorData);
        alert(`Failed to create form: ${JSON.stringify(errorData)}`);
        return;
      }

      const newForm = await response.json();
      setForms((prev) => [...prev, newForm]);
      setTitle("");
      setDescription("");
      setShowForm(false);
    } catch (error) {
      console.error("Error creating form:", error);
      alert("Could not connect to the Django server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Delete Form
  async function deleteForm(formId: number) {
    if (!confirm("Are you sure you want to delete this form?")) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/forms/${formId}/`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete form.");
      }

      setForms((prev) => prev.filter((form) => form.id !== formId));
    } catch (error) {
      console.error("Error deleting form:", error);
      alert("Could not delete form.");
    }
  }

  // Edit Form
  async function editForm(formId: number) {
    const form = forms.find((form) => form.id === formId);

    if (!form) {
      return;
    }

    const newTitle = prompt("Enter new form title:", form.title);

    if (newTitle === null) {
      return;
    }

    if (newTitle.trim() === "") {
      alert("Title cannot be empty.");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/forms/${formId}/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: newTitle,
            description: form.description,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update form.");
      }

      const updatedForm = await response.json();

      setForms((prev) =>
        prev.map((f) => (f.id === formId ? updatedForm : f))
      );
    } catch (error) {
      console.error("Error updating form:", error);
      alert("Could not update form.");
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
    } catch (error) {
      console.error("Error duplicating form:", error);
      alert("Could not duplicate form.");
    }
  }
//publish form
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
        form.id === formId
          ? updatedForm
          : form
      )
    );

  } catch (error) {
    console.error("Error publishing form:", error);

    alert("Could not publish form.");
  }
}
//unpublish form
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
        form.id === formId
          ? updatedForm
          : form
      )
    );

  } catch (error) {
    console.error("Error unpublishing form:", error);

    alert("Could not unpublish form.");
  }
}

  // Share Form
  function shareForm(formId: number) {
    const url = `${window.location.origin}/forms/${formId}`;
    navigator.clipboard.writeText(url);
    alert(`Public form link copied to clipboard!\n\n${url}`);
    window.open(url, "_blank");
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
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]"
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

        {/* Create Form Section */}
        {showForm && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Create New Form
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Fill in the details below to add a new form.
            </p>

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
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
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
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={createForm}
                  disabled={isSubmitting}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Save Form"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Forms List */}
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
              Loading your forms...
            </div>
          ) : forms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
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
                className="mt-4 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition"
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
                  className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
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
                    <div className="flex items-center gap-2 self-end sm:self-start">
                      <button
                        onClick={() => editForm(form.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 active:scale-95"
                        title="Edit Title"
                      >
                        {/* edit svg Means :- Change Title and Description of Form */}
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
                        title="Duplicate Form">
                        <svg className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                        Duplicate
                      </button>

                      {form.status === "published" ? (
                        <button
                          onClick={() => unpublishForm(form.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm transition hover:bg-amber-50 hover:border-amber-300 active:scale-95"
                          title="Unpublish Form">
                          <svg className="h-3.5 w-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                          </svg>
                          Unpublish
                        </button>
                      ) : (
                        <button
                          onClick={() => publishForm(form.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-50 hover:border-emerald-300 active:scale-95"
                          title="Publish Form">
                          <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                          </svg>
                          Publish
                        </button>
                      )}

                      {form.status === "published" && (
                        <button
                          onClick={() => shareForm(form.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm transition hover:bg-blue-50 hover:border-blue-300 active:scale-95"
                          title="Share / Copy Public Form Link"
                          >

                          <svg className="h-3.5 w-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                          </svg>
                          Share
                        </button>
                      )}

                      <button
                        onClick={() => deleteForm(form.id)}
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
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
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
    </main>
  );
}