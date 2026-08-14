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

  // Edit Question State
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(
    null
  );
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editQuestionType, setEditQuestionType] = useState("short_text");
  const [editRequired, setEditRequired] = useState(false);
  const [editOptions, setEditOptions] = useState<Option[]>([]);
  const [editOptionText, setEditOptionText] = useState("");

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
      }

      setLoading(false);
    }

    getForm();
  }, [params]);

  // Option handlers for Add Question
  function addOption() {
    if (optionText.trim() === "") {
      alert("Option cannot be empty.");
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
      alert("Please enter question text.");
      return;
    }

    if (isChoiceBased && options.length === 0) {
      alert("Please add at least one option for choice questions.");
      return;
    }

    try {
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
            question_text: questionText,
            question_type: questionType,
            required: required,
            order: nextOrder,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error saving question:", errorData);
        alert("Failed to save question.");
        return;
      }

      const newQuestion: Question = await response.json();
      newQuestion.options = [];

      // 2. If choice-based, create each option in Django
      if (isChoiceBased) {
        for (const opt of options) {
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
              }),
            }
          );

          if (optResponse.ok) {
            const savedOption = await optResponse.json();
            newQuestion.options.push(savedOption);
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
      alert("Question saved successfully!");
    } catch (error) {
      console.error("Error saving question:", error);
      alert("Could not connect to the server.");
    }
  }

  // Delete Question
  async function deleteQuestion(questionId: number) {
    if (!confirm("Are you sure you want to delete this question?")) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/questions/${questionId}/`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete question.");
      }

      setForm({
        ...form!,
        questions: (form?.questions || []).filter((q) => q.id !== questionId),
      });

      alert("Question deleted successfully!");
    } catch (error) {
      console.error("Error deleting question:", error);
      alert("Could not delete question.");
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
      alert("Option text cannot be empty.");
      return;
    }

    try {
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
      alert("Could not add option.");
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
      alert("Could not delete option.");
    }
  }

  async function updateQuestion(questionId: number) {
    if (!form) return;

    if (editQuestionText.trim() === "") {
      alert("Please enter question text.");
      return;
    }

    if (isEditChoiceBased && editOptions.length === 0) {
      alert("Please add at least one option for choice questions.");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/questions/${questionId}/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            form: form.id,
            question_text: editQuestionText,
            question_type: editQuestionType,
            required: editRequired,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error updating question:", errorData);
        alert("Failed to update question.");
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
      alert("Question updated successfully!");
    } catch (error) {
      console.error("Error updating question:", error);
      alert("Could not update question.");
    }
  }

  // ==========================================
  // QUESTION REORDERING (MOVE UP / MOVE DOWN)
  // ==========================================

  // Move question UP
  async function moveQuestionUp(index: number) {
    if (!form || !form.questions) return;

    // If it's already the first question, do nothing
    if (index <= 0) return;

    // Step 1: Create a copy of the array (React state should never be modified directly)
    const newQuestions = [...form.questions];

    // Step 2: Swap the current question with the one above it using a temporary variable
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[index - 1];
    newQuestions[index - 1] = temp;

    // Step 3: Update the order property for each question (1, 2, 3, etc.)
    for (let i = 0; i < newQuestions.length; i++) {
      newQuestions[i].order = i + 1;
    }

    const previousQuestions = form.questions;

    // 4. Update UI state immediately
    setForm({
      ...form,
      questions: newQuestions,
    });

    // 5. Save new order to Django using PUT /api/questions/<id>/
    await saveQuestionOrder(newQuestions[index], newQuestions[index - 1], previousQuestions);
  }

  // Move a question DOWN by 1 position
  async function moveQuestionDown(index: number) {
    if (!form || !form.questions) return;

    // If last item, do nothing
    if (index >= form.questions.length - 1) return;

    // 1. Copy the questions array
    const newQuestions = [...form.questions];

    // 2. Swap question with the one below it
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[index + 1];
    newQuestions[index + 1] = temp;

    // 3. Update order numbers (1-based index)
    for (let i = 0; i < newQuestions.length; i++) {
      newQuestions[i].order = i + 1;
    }

    const previousQuestions = form.questions;

    // Step 5: Update the React state immediately so user sees the change right away
    setForm({
      ...form,
      questions: newQuestions,
    });

    // 5. Save new order to Django using PUT /api/questions/<id>/
    await saveQuestionOrder(newQuestions[index], newQuestions[index + 1], previousQuestions);
  }

  // Update order for the swapped questions using PUT /api/questions/<id>/
  async function saveQuestionOrder(
    q1: Question,
    q2: Question,
    fallbackQuestions: Question[]
  ) {
    try {
      // Update first question's order in Django
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

      // Update second question's order in Django
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
      alert("Failed to update question order on server. Reverting back.");

      // Revert to previous order if request fails
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
      <main className="min-h-screen bg-gray-100 p-10">
        <p>Loading form builder...</p>
      </main>
    );
  }

  if (!form) {
    return (
      <main className="min-h-screen bg-gray-100 p-10">
        <p>Form not found.</p>
        <Link href="/dashboard" className="text-blue-600 underline">
          Back to Dashboard
        </Link>
      </main>
    );
  }

  const questions = form.questions || [];

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-gray-500 hover:underline"
            >
              &larr; Back to Dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-bold">{form.title}</h1>
            <p className="mt-1 text-gray-600">{form.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/forms/${form.id}/responses`}
              className="rounded border bg-white px-4 py-2 text-sm hover:bg-gray-50 font-medium"
            >
              View Responses ({form.questions?.length ? `${form.questions.length} questions` : "0 questions"})
            </Link>

            <Link
              href={`/forms/${form.id}`}
              target="_blank"
              className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
            >
              Preview Public Form
            </Link>
          </div>
        </div>

        {/* Form Questions Section */}
        <div className="mt-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">Form Questions Builder</h2>
          <p className="mt-1 text-gray-600">
            Add, reorder, and configure the questions for this form.
          </p>

          {!showAddQuestion && !editingQuestionId && (
            <button
              onClick={() => {
                setShowAddQuestion(true);
                setOptions([]);
                setOptionText("");
              }}
              className="mt-6 rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800"
            >
              + Add Question
            </button>
          )}

          {/* Add Question Form */}
          {showAddQuestion && (
            <div className="mt-6 rounded-lg border p-5">
              <h3 className="text-lg font-semibold">Add Question</h3>

              <div className="mt-4">
                <label className="block text-sm font-medium">
                  Question Text
                </label>
                <input
                  type="text"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="e.g. What is your preferred contact method?"
                  className="mt-2 w-full rounded border p-3"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium">
                  Question Type
                </label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                  className="mt-2 w-full rounded border p-3"
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
                <div className="mt-4 rounded border bg-gray-50 p-4">
                  <label className="block text-sm font-medium">Options</label>

                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={optionText}
                      onChange={(e) => setOptionText(e.target.value)}
                      placeholder="Enter an option..."
                      className="w-full rounded border bg-white p-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={addOption}
                      className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
                    >
                      + Add Option
                    </button>
                  </div>

                  {options.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {options.map((opt, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded border bg-white p-2 text-sm"
                        >
                          <span>{opt}</span>
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
                />
                <label htmlFor="required-checkbox" className="text-sm">
                  Required
                </label>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={saveQuestion}
                  className="rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800"
                >
                  Save Question
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddQuestion(false);
                    setOptions([]);
                    setOptionText("");
                  }}
                  className="rounded-lg border px-5 py-3 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* List of current questions */}
          <div className="mt-6 space-y-4">
            {questions.map((q, idx) => {
              const isEditingThis = editingQuestionId === q.id;

              return (
                <div key={q.id || idx} className="rounded border p-4">
                  {/* Normal Display Mode */}
                  {!isEditingThis ? (
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">
                          {idx + 1}. {q.question_text}
                        </h4>

                        {/* Action buttons: Move Up, Edit, Delete, Move Down */}
                        <div className="flex items-center gap-2">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => moveQuestionUp(idx)}
                              className="rounded border px-2.5 py-1 text-xs hover:bg-gray-50"
                              title="Move Up"
                            >
                              Move Up
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => startEdit(q)}
                            className="rounded border px-3 py-1 text-xs hover:bg-gray-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteQuestion(q.id)}
                            className="rounded border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>

                          {idx < questions.length - 1 && (
                            <button
                              type="button"
                              onClick={() => moveQuestionDown(idx)}
                              className="rounded border px-2.5 py-1 text-xs hover:bg-gray-50"
                              title="Move Down"
                            >
                              Move Down
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="mt-1 text-xs text-gray-500 capitalize">
                        Type: {q.question_type.replace("_", " ")}
                        {q.required && " • Required"}
                      </p>

                      {/* Display existing options */}
                      {q.options && q.options.length > 0 && (
                        <div className="mt-2 pl-4">
                          <p className="text-xs font-medium text-gray-500">
                            Options:
                          </p>
                          <ul className="mt-1 list-disc list-inside text-sm text-gray-700">
                            {q.options.map((opt) => (
                              <li key={opt.id}>{opt.option_text}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Edit Mode Form */
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold">
                        Edit Question {idx + 1}
                      </h3>

                      <div>
                        <label className="block text-sm font-medium">
                          Question Text
                        </label>
                        <input
                          type="text"
                          value={editQuestionText}
                          onChange={(e) => setEditQuestionText(e.target.value)}
                          className="mt-1 w-full rounded border p-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium">
                          Question Type
                        </label>
                        <select
                          value={editQuestionType}
                          onChange={(e) => setEditQuestionType(e.target.value)}
                          className="mt-1 w-full rounded border p-2 text-sm"
                        >
                          <option value="short_text">Short Text</option>
                          <option value="long_text">Long Text</option>
                          <option value="multiple_choice">
                            Multiple Choice
                          </option>
                          <option value="dropdown">Dropdown</option>
                          <option value="email">Email</option>
                          <option value="number">Number</option>
                          <option value="rating">Rating</option>
                        </select>
                      </div>

                      {/* Edit Options Section */}
                      {isEditChoiceBased && (
                        <div className="rounded border bg-gray-50 p-3">
                          <label className="block text-xs font-medium text-gray-700">
                            Options
                          </label>

                          <div className="mt-2 flex gap-2">
                            <input
                              type="text"
                              value={editOptionText}
                              onChange={(e) =>
                                setEditOptionText(e.target.value)
                              }
                              placeholder="Enter option..."
                              className="w-full rounded border bg-white p-1.5 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => addEditOption(q.id)}
                              className="rounded bg-black px-3 py-1 text-xs text-white"
                            >
                              + Add
                            </button>
                          </div>

                          {editOptions.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {editOptions.map((opt) => (
                                <div
                                  key={opt.id}
                                  className="flex items-center justify-between rounded border bg-white px-2.5 py-1 text-xs"
                                >
                                  <span>{opt.option_text}</span>
                                  <button
                                    type="button"
                                    onClick={() => deleteEditOption(opt.id)}
                                    className="text-red-600 hover:text-red-800"
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
                        />
                        <label
                          htmlFor={`edit-required-${q.id}`}
                          className="text-xs"
                        >
                          Required
                        </label>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuestion(q.id)}
                          className="rounded bg-black px-4 py-2 text-xs text-white"
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded border px-4 py-2 text-xs"
                        >
                          Cancel
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
    </main>
  );
}
