"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Option {
  id: number;
  option_text: string;
  order: number;
}

interface Question {
  id: number;
  question_text: string;
  question_type: string;
  description: string;
  required: boolean;
  order: number;
  options: Option[];
}

interface Form {
  id: number;
  title: string;
  description: string;
  status: string;
  questions?: Question[];
}

interface ModalAlert {
  title: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

export default function BuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);

  // Add Question State
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("short_text");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [optionText, setOptionText] = useState("");
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // Edit Question State
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(
    null
  );
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editQuestionType, setEditQuestionType] = useState("short_text");
  const [editRequired, setEditRequired] = useState(false);
  const [editOptions, setEditOptions] = useState<Option[]>([]);
  const [editOptionText, setEditOptionText] = useState("");
  const [isUpdatingQuestion, setIsUpdatingQuestion] = useState(false);

  // Delete Question Modal State
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [isDeletingQuestion, setIsDeletingQuestion] = useState(false);

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

  const isChoiceBased =
    questionType === "multiple_choice" || questionType === "dropdown";

  const isEditChoiceBased =
    editQuestionType === "multiple_choice" || editQuestionType === "dropdown";

  // Load the form and its questions when page loads
  useEffect(() => {
    async function getForm() {
      const { id } = await params;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/forms/${id}/`
        );

        if (!response.ok) {
          throw new Error("Form not found.");
        }

        const data = await response.json();

        // Sort questions by their order property (1, 2, 3...)
        if (data && Array.isArray(data.questions)) {
          data.questions.sort(
            (a: Question, b: Question) => a.order - b.order
          );
        }

        setForm(data);
      } catch (error) {
        console.error("Error loading form:", error);
        showAlert("Could not load form from server.", "error");
      }

      setLoading(false);
    }

    getForm();
  }, [params]);

  // Option handlers for Add Question
  function addOption() {
    if (optionText.trim() === "") {
      showAlert("Option text cannot be empty.", "warning", "Missing Option");
      return;
    }
    setOptions([...options, optionText.trim()]);
    setOptionText("");
  }

  function deleteOption(indexToDelete: number) {
    setOptions(options.filter((_, index) => index !== indexToDelete));
  }

  // Save new Question
  async function saveQuestion() {
    if (!form) return;

    if (questionText.trim() === "") {
      showAlert("Please enter question text before saving.", "warning", "Missing Question Text");
      return;
    }

    if (isChoiceBased && options.length === 0) {
      showAlert(
        "Please add at least one option for choice questions.",
        "warning",
        "Options Required"
      );
      return;
    }

    try {
      setIsSavingQuestion(true);
      // Order number for the new question
      const nextOrder = (form.questions?.length || 0) + 1;

      // 1. Create Question in Django
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/questions/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            form: form.id,
            question_text: questionText.trim(),
            question_type: questionType,
            description: "",
            required: required,
            order: nextOrder,
          }),
        }
      );

      if (!response.ok) {
        let errDetail = "Failed to save question.";
        try {
          const errorData = await response.json();
          console.error("Error saving question:", errorData);
          if (errorData.detail) {
            errDetail = errorData.detail;
          } else if (typeof errorData === "object") {
            errDetail = Object.entries(errorData)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
              .join(" | ");
          }
        } catch {}
        showAlert(errDetail, "error", "Failed to Save Question");
        return;
      }

      const newQuestion: Question = await response.json();
      newQuestion.options = [];

      // 2. If choice-based, create each option in Django
      if (isChoiceBased) {
        for (let i = 0; i < options.length; i++) {
          const opt = options[i];
          const optResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/options/`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                question: newQuestion.id,
                option_text: opt,
                order: i + 1,
              }),
            }
          );

          if (optResponse.ok) {
            const savedOption = await optResponse.json();
            newQuestion.options.push(savedOption);
          } else {
            console.error("Option save error:", await optResponse.json().catch(() => ({})));
          }
        }
      }

      // 3. Add new question to local state
      setForm({
        ...form,
        questions: [...(form.questions || []), newQuestion],
      });

      // 4. Reset form fields
      setQuestionText("");
      setQuestionType("short_text");
      setRequired(false);
      setOptions([]);
      setOptionText("");
      setShowAddQuestion(false);
      showAlert("Question has been added to your form!", "success", "Question Saved");
    } catch (error) {
      console.error("Error saving question:", error);
      showAlert("Could not connect to the server. Please check your network connection.", "error");
    } finally {
      setIsSavingQuestion(false);
    }
  }

  // Delete Question confirmation
  async function confirmDeleteQuestion() {
    if (!deletingQuestion) return;

    try {
      setIsDeletingQuestion(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/questions/${deletingQuestion.id}/`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete question.");
      }

      setForm({
        ...form!,
        questions: (form?.questions || []).filter((q) => q.id !== deletingQuestion.id),
      });

      setDeletingQuestion(null);
      showAlert("The question has been removed from this form.", "success", "Question Deleted");
    } catch (error) {
      console.error("Error deleting question:", error);
      showAlert("Could not delete question. Please try again.", "error");
    } finally {
      setIsDeletingQuestion(false);
    }
  }

  // Edit Question handlers
  function startEdit(q: Question) {
    setEditingQuestionId(q.id);
    setEditQuestionText(q.question_text);
    setEditQuestionType(q.question_type);
    setEditRequired(q.required);
    setEditOptions(q.options || []);
    setEditOptionText("");
    setShowAddQuestion(false);
  }

  function cancelEdit() {
    setEditingQuestionId(null);
    setEditQuestionText("");
    setEditQuestionType("short_text");
    setEditRequired(false);
    setEditOptions([]);
    setEditOptionText("");
  }

  async function addEditOption(questionId: number) {
    if (editOptionText.trim() === "") {
      showAlert("Option text cannot be empty.", "warning", "Missing Option");
      return;
    }

    try {
      const nextOrder = (editOptions.length || 0) + 1;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/options/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: questionId,
            option_text: editOptionText.trim(),
            order: nextOrder,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add option.");
      }

      const newOpt = await response.json();
      setEditOptions([...editOptions, newOpt]);
      setEditOptionText("");
    } catch (err) {
      console.error("Error adding option:", err);
      showAlert("Could not add option. Please try again.", "error");
    }
  }

  async function deleteEditOption(optionId: number) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/options/${optionId}/`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete option.");
      }

      setEditOptions(editOptions.filter((opt) => opt.id !== optionId));
    } catch (err) {
      console.error("Error deleting option:", err);
      showAlert("Could not delete option.", "error");
    }
  }

  async function updateQuestion(questionId: number) {
    if (!form) return;

    if (editQuestionText.trim() === "") {
      showAlert("Please enter question text.", "warning", "Missing Question Text");
      return;
    }

    if (isEditChoiceBased && editOptions.length === 0) {
      showAlert(
        "Please add at least one option for choice questions.",
        "warning",
        "Options Required"
      );
      return;
    }

    try {
      setIsUpdatingQuestion(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/questions/${questionId}/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            form: form.id,
            question_text: editQuestionText.trim(),
            question_type: editQuestionType,
            required: editRequired,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error updating question:", errorData);
        showAlert("Failed to update question on the server.", "error");
        return;
      }

      const updatedQuestion: Question = await response.json();
      updatedQuestion.options = editOptions;

      setForm({
        ...form,
        questions: (form.questions || []).map((q) =>
          q.id === questionId ? updatedQuestion : q
        ),
      });

      cancelEdit();
      showAlert("Question details updated successfully!", "success", "Question Updated");
    } catch (error) {
      console.error("Error updating question:", error);
      showAlert("Could not update question.", "error");
    } finally {
      setIsUpdatingQuestion(false);
    }
  }

  // Question reordering
  async function moveQuestionUp(index: number) {
    if (!form || !form.questions) return;
    if (index <= 0) return;

    const newQuestions = [...form.questions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[index - 1];
    newQuestions[index - 1] = temp;

    for (let i = 0; i < newQuestions.length; i++) {
      newQuestions[i].order = i + 1;
    }

    const previousQuestions = form.questions;

    setForm({
      ...form,
      questions: newQuestions,
    });

    await saveQuestionOrder(newQuestions[index], newQuestions[index - 1], previousQuestions);
  }

  async function moveQuestionDown(index: number) {
    if (!form || !form.questions) return;
    if (index >= form.questions.length - 1) return;

    const newQuestions = [...form.questions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[index + 1];
    newQuestions[index + 1] = temp;

    for (let i = 0; i < newQuestions.length; i++) {
      newQuestions[i].order = i + 1;
    }

    const previousQuestions = form.questions;

    setForm({
      ...form,
      questions: newQuestions,
    });

    await saveQuestionOrder(newQuestions[index], newQuestions[index + 1], previousQuestions);
  }

  async function saveQuestionOrder(
    q1: Question,
    q2: Question,
    fallbackQuestions: Question[]
  ) {
    try {
      const res1 = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/questions/${q1.id}/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order: q1.order,
          }),
        }
      );

      const res2 = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/questions/${q2.id}/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order: q2.order,
          }),
        }
      );

      if (!res1.ok || !res2.ok) {
        throw new Error("Failed to update order on server.");
      }
    } catch (error) {
      console.error("Error saving question order:", error);
      showAlert("Failed to update question order on server.", "error");

      if (form) {
        setForm({
          ...form,
          questions: fallbackQuestions,
        });
      }
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-10">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
          Loading form builder...
        </div>
      </main>
    );
  }

  if (!form) {
    return (
      <main className="min-h-screen bg-slate-50 p-10">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Form Not Found</h1>
          <p className="mt-2 text-sm text-slate-500">The form could not be loaded.</p>
          <Link href="/dashboard" className="mt-4 inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition">
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const questions = form.questions || [];

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-6">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition"
            >
              &larr; Back to Dashboard
            </Link>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">{form.title}</h1>
            {form.description && (
              <p className="mt-1 text-sm text-slate-500">{form.description}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/forms/${form.id}/responses`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              View Responses ({questions.length} {questions.length === 1 ? "question" : "questions"})
            </Link>

            <Link
              href={`/forms/${form.id}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              <svg className="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Preview Public Form
            </Link>
          </div>
        </div>

        {/* Form Questions Section */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Form Questions Builder</h2>
              <p className="mt-1 text-xs text-slate-500">
                Add, reorder, and configure the questions for this form.
              </p>
            </div>

            {!showAddQuestion && !editingQuestionId && (
              <button
                onClick={() => {
                  setShowAddQuestion(true);
                  setOptions([]);
                  setOptionText("");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800"
              >
                + Add Question
              </button>
            )}
          </div>

          {/* Add Question Card */}
          {showAddQuestion && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">Add Question</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddQuestion(false);
                    setOptions([]);
                    setOptionText("");
                  }}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Question Text <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="e.g. What is your full name?"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="mt-4">
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Question Type
                </label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                >
                  <option value="short_text">Short Text</option>
                  <option value="long_text">Long Text</option>
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="dropdown">Dropdown</option>
                  <option value="email">Email</option>
                  <option value="number">Number</option>
                  <option value="rating">Rating</option>
                </select>
              </div>

              {/* Options Section */}
              {isChoiceBased && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                  <label className="block text-xs font-semibold uppercase text-slate-600">
                    Options <span className="text-red-500">*</span>
                  </label>

                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={optionText}
                      onChange={(e) => setOptionText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addOption();
                        }
                      }}
                      placeholder="Enter an option..."
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                    />
                    <button
                      type="button"
                      onClick={addOption}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition"
                    >
                      + Add
                    </button>
                  </div>

                  {options.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {options.map((opt, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                        >
                          <span className="font-medium text-slate-800">{opt}</span>
                          <button
                            type="button"
                            onClick={() => deleteOption(idx)}
                            className="text-xs text-red-600 hover:text-red-800 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="required-checkbox"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="required-checkbox" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Required field
                </label>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddQuestion(false);
                    setOptions([]);
                    setOptionText("");
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveQuestion}
                  disabled={isSavingQuestion}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSavingQuestion ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    "Save Question"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* List of current questions */}
          <div className="mt-6 space-y-4">
            {questions.length === 0 && !showAddQuestion && (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
                No questions added yet. Click &quot;+ Add Question&quot; above to add your first question.
              </div>
            )}

            {questions.map((q, idx) => {
              const isEditingThis = editingQuestionId === q.id;

              return (
                <div key={q.id || idx} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
                  {/* Normal Display Mode */}
                  {!isEditingThis ? (
                    <div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                            {idx + 1}
                          </span>
                          <h4 className="font-semibold text-slate-900 text-sm">
                            {q.question_text}
                          </h4>
                          {q.required && (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 border border-red-100">
                              Required
                            </span>
                          )}
                        </div>

                        {/* Action buttons: Move Up, Edit, Delete, Move Down */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => moveQuestionUp(idx)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition"
                              title="Move Up"
                            >
                              ↑ Up
                            </button>
                          )}

                          {idx < questions.length - 1 && (
                            <button
                              type="button"
                              onClick={() => moveQuestionDown(idx)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition"
                              title="Move Down"
                            >
                              ↓ Down
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => startEdit(q)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingQuestion(q)}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-300 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-slate-500 capitalize">
                        Type: <span className="font-medium text-slate-700">{q.question_type.replace("_", " ")}</span>
                      </p>

                      {/* Display existing options */}
                      {q.options && q.options.length > 0 && (
                        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Options ({q.options.length}):
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {q.options.map((opt) => (
                              <span
                                key={opt.id}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-2xs"
                              >
                                {opt.option_text}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Edit Mode Form Card */
                    <div className="space-y-4 rounded-xl bg-slate-50/60 p-4 border border-slate-200">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          Edit Question {idx + 1}
                        </h3>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          ✕
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-600">
                          Question Text <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editQuestionText}
                          onChange={(e) => setEditQuestionText(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-600">
                          Question Type
                        </label>
                        <select
                          value={editQuestionType}
                          onChange={(e) => setEditQuestionType(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        >
                          <option value="short_text">Short Text</option>
                          <option value="long_text">Long Text</option>
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="dropdown">Dropdown</option>
                          <option value="email">Email</option>
                          <option value="number">Number</option>
                          <option value="rating">Rating</option>
                        </select>
                      </div>

                      {/* Edit Options Section */}
                      {isEditChoiceBased && (
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <label className="block text-xs font-semibold uppercase text-slate-600">
                            Options
                          </label>

                          <div className="mt-2 flex gap-2">
                            <input
                              type="text"
                              value={editOptionText}
                              onChange={(e) => setEditOptionText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addEditOption(q.id);
                                }
                              }}
                              placeholder="Enter option..."
                              className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => addEditOption(q.id)}
                              className="rounded-xl bg-slate-900 px-3 py-1 text-xs text-white hover:bg-slate-800 transition"
                            >
                              + Add
                            </button>
                          </div>

                          {editOptions.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {editOptions.map((opt) => (
                                <div
                                  key={opt.id}
                                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs"
                                >
                                  <span className="text-slate-800">{opt.option_text}</span>
                                  <button
                                    type="button"
                                    onClick={() => deleteEditOption(opt.id)}
                                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`edit-required-${q.id}`}
                          checked={editRequired}
                          onChange={(e) => setEditRequired(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <label
                          htmlFor={`edit-required-${q.id}`}
                          className="text-xs font-medium text-slate-700 cursor-pointer"
                        >
                          Required field
                        </label>
                      </div>

                      <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => updateQuestion(q.id)}
                          disabled={isUpdatingQuestion}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
                        >
                          {isUpdatingQuestion ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =========================================
          DELETE QUESTION CARD MODAL
         ========================================= */}
      {deletingQuestion && (
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
                <h3 className="text-lg font-bold text-slate-900">Delete Question</h3>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold text-slate-900">&quot;{deletingQuestion.question_text}&quot;</span>?
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setDeletingQuestion(null)}
                disabled={isDeletingQuestion}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteQuestion}
                disabled={isDeletingQuestion}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
              >
                {isDeletingQuestion ? "Deleting..." : "Delete Question"}
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
