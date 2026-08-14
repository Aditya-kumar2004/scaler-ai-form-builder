"use client";

import { useEffect, useState } from "react";

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
  questions: Question[];
}

interface Toast {
  message: string;
  type: "success" | "error" | "info";
}

export default function PublicForm({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 4000);
  };

  // Fetch form from Django backend
  useEffect(() => {
    async function getForm() {
      const { id } = await params;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/forms/${id}/`
        );

        if (!response.ok) {
          throw new Error("Form not found");
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
        showToast("Error loading form.", "error");
      }

      setLoading(false);
    }

    getForm();
  }, [params]);

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 sm:p-10 flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600">Loading form...</p>
        </div>
      </main>
    );
  }

  // Form not found state
  if (!form) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 sm:p-10 flex items-center justify-center">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Form Not Found</h1>
          <p className="mt-2 text-sm text-slate-500">
            The form you are looking for does not exist or has been removed.
          </p>
        </div>
      </main>
    );
  }

  // Thank You screen after successful submission
  if (submitted) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 sm:p-10 flex items-center justify-center">
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-md animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Thank You!</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your response has been recorded successfully.
          </p>
        </div>
      </main>
    );
  }

  // Empty questions state
  if (!form.questions || form.questions.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 sm:p-10 flex items-center justify-center">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">{form.title}</h1>
          {form.description && (
            <p className="mt-2 text-sm text-slate-600">{form.description}</p>
          )}
          <p className="mt-6 text-xs text-slate-400">
            This form does not have any questions yet.
          </p>
        </div>
      </main>
    );
  }

  const question = form.questions[currentQuestion];

  // Helper to handle answer change for a question
  const handleAnswerChange = (value: string) => {
    setAnswers({
      ...answers,
      [question.id]: value,
    });
  };

  // Move to next question with required check
  const handleNext = () => {
    const answer = answers[question.id];

    if (question.required && (!answer || answer.trim() === "")) {
      showToast("Please answer this required question before continuing.", "error");
      return;
    }

    if (currentQuestion < form.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  // Submit answers to Django backend
  const handleSubmit = async () => {
    const answer = answers[question.id];

    if (question.required && (!answer || answer.trim() === "")) {
      showToast("Please answer this required question before submitting.", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/responses/submit/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            form: form.id,
            answers: Object.entries(answers).map(
              ([questionId, answerText]) => ({
                question: Number(questionId),
                answer_text: answerText,
              })
            ),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Submit error:", data);
        const errorMessage =
          data.detail ||
          (Array.isArray(data.non_field_errors) && data.non_field_errors[0]) ||
          (Array.isArray(data) && data[0]) ||
          (typeof data === "string" ? data : JSON.stringify(data));
        showToast(`Failed to submit form: ${errorMessage}`, "error");
        return;
      }

      setSubmitted(true);
    } catch (error) {
      console.error("Submit error:", error);
      showToast("Something went wrong while submitting. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-10 flex flex-col items-center justify-center text-slate-900">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          {/* Form Title & Description */}
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{form.title}</h1>
          {form.description && (
            <p className="mt-2 text-sm text-slate-600">{form.description}</p>
          )}

          {/* Current Question */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Question {currentQuestion + 1} of {form.questions.length}
              </p>
              <div className="h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-slate-900 transition-all duration-300"
                  style={{
                    width: `${((currentQuestion + 1) / form.questions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <h2 className="mt-3 text-lg font-bold text-slate-900">
              {question.question_text}
              {question.required && (
                <span className="ml-1 text-red-500" title="Required">
                  *
                </span>
              )}
            </h2>

            {question.description && (
              <p className="mt-1 text-xs text-slate-500">
                {question.description}
              </p>
            )}

            {/* 1. Short Text Input */}
            {question.question_type === "short_text" && (
              <input
                type="text"
                className="mt-4 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                placeholder="Your answer..."
                value={answers[question.id] || ""}
                onChange={(e) => handleAnswerChange(e.target.value)}
              />
            )}

            {/* 2. Long Text / Textarea */}
            {question.question_type === "long_text" && (
              <textarea
                rows={4}
                className="mt-4 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                placeholder="Type your detailed answer..."
                value={answers[question.id] || ""}
                onChange={(e) => handleAnswerChange(e.target.value)}
              />
            )}

            {/* 3. Email Input */}
            {question.question_type === "email" && (
              <input
                type="email"
                className="mt-4 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                placeholder="name@example.com"
                value={answers[question.id] || ""}
                onChange={(e) => handleAnswerChange(e.target.value)}
              />
            )}

            {/* 4. Number Input */}
            {question.question_type === "number" && (
              <input
                type="number"
                className="mt-4 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                placeholder="Enter a number..."
                value={answers[question.id] || ""}
                onChange={(e) => handleAnswerChange(e.target.value)}
              />
            )}

            {/* 5. Multiple Choice (Radio Buttons) */}
            {question.question_type === "multiple_choice" && (
              <div className="mt-4 space-y-2.5">
                {question.options && question.options.length > 0 ? (
                  question.options.map((option) => (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center rounded-xl border p-3.5 text-sm transition ${
                        answers[question.id] === option.option_text
                          ? "border-slate-900 bg-slate-50 font-medium text-slate-900 shadow-2xs"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option.option_text}
                        checked={answers[question.id] === option.option_text}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        className="mr-3 h-4 w-4 text-slate-900 focus:ring-slate-900"
                      />
                      <span>{option.option_text}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No options configured.</p>
                )}
              </div>
            )}

            {/* 6. Dropdown */}
            {question.question_type === "dropdown" && (
              <select
                className="mt-4 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                value={answers[question.id] || ""}
                onChange={(e) => handleAnswerChange(e.target.value)}
              >
                <option value="">-- Select an option --</option>
                {question.options &&
                  question.options.map((option) => (
                    <option key={option.id} value={option.option_text}>
                      {option.option_text}
                    </option>
                  ))}
              </select>
            )}

            {/* 7. Rating Input (1 to 5) */}
            {question.question_type === "rating" && (
              <div className="mt-4 flex gap-2.5">
                {[1, 2, 3, 4, 5].map((rating) => {
                  const isSelected = answers[question.id] === String(rating);
                  return (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => handleAnswerChange(String(rating))}
                      className={`h-11 w-11 rounded-xl border text-sm font-semibold transition ${
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {rating}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
              {currentQuestion > 0 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestion(currentQuestion - 1)}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Previous
                </button>
              ) : (
                <div />
              )}

              {currentQuestion < form.questions.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800 transition"
                >
                  Next &rarr;
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    "Submit Form"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          CARD TOAST NOTIFICATION
         ========================================= */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 duration-300 max-w-sm">
          <div
            className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
              toast.type === "success"
                ? "bg-emerald-500 ring-4 ring-emerald-100"
                : toast.type === "error"
                ? "bg-red-500 ring-4 ring-red-100"
                : "bg-blue-500 ring-4 ring-blue-100"
            }`}
          />
          <p className="text-xs font-medium text-slate-800 flex-1">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </main>
  );
}