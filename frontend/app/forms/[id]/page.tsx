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
      }

      setLoading(false);
    }

    getForm();
  }, [params]);

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-10">
        <p className="text-center text-gray-600">Loading form...</p>
      </main>
    );
  }

  // Form not found state
  if (!form) {
    return (
      <main className="min-h-screen bg-gray-100 p-10">
        <div className="mx-auto max-w-xl rounded-lg bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold text-gray-800">Form Not Found</h1>
          <p className="mt-2 text-gray-600">
            The form you are looking for does not exist or has been removed.
          </p>
        </div>
      </main>
    );
  }

  // Thank You screen after successful submission
  if (submitted) {
    return (
      <main className="min-h-screen bg-gray-100 p-10">
        <div className="mx-auto max-w-2xl rounded-lg bg-white p-10 text-center shadow">
          <h1 className="text-3xl font-bold text-gray-900">Thank You!</h1>
          <p className="mt-4 text-gray-600">
            Your response has been submitted successfully.
          </p>
        </div>
      </main>
    );
  }

  // Empty questions state
  if (!form.questions || form.questions.length === 0) {
    return (
      <main className="min-h-screen bg-gray-100 p-10">
        <div className="mx-auto max-w-2xl rounded-lg bg-white p-8 shadow">
          <h1 className="text-3xl font-bold text-gray-900">{form.title}</h1>
          {form.description && (
            <p className="mt-3 text-gray-600">{form.description}</p>
          )}
          <p className="mt-6 text-gray-500">
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
      alert("Please answer this required question before continuing.");
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
      alert("Please answer this required question before continuing.");
      return;
    }

    try {
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
        alert(`Failed to submit form:\n${errorMessage}`);
        return;
      }

      setSubmitted(true);
    } catch (error) {
      console.error("Submit error:", error);
      alert("Something went wrong while submitting. Please try again.");
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-8 shadow">
        {/* Form Title & Description */}
        <h1 className="text-3xl font-bold text-gray-900">{form.title}</h1>
        {form.description && (
          <p className="mt-2 text-gray-600">{form.description}</p>
        )}

        {/* Current Question */}
        <div className="mt-8 border-t pt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Question {currentQuestion + 1} of {form.questions.length}
          </p>

          <h2 className="mt-2 text-xl font-bold text-gray-800">
            {question.question_text}
            {question.required && (
              <span className="ml-1 text-red-500" title="Required">
                *
              </span>
            )}
          </h2>

          {question.description && (
            <p className="mt-1 text-sm text-gray-500">
              {question.description}
            </p>
          )}

          {/* 1. Short Text Input */}
          {question.question_type === "short_text" && (
            <input
              type="text"
              className="mt-4 w-full rounded border p-3 text-sm focus:border-black focus:outline-none"
              placeholder="Your answer..."
              value={answers[question.id] || ""}
              onChange={(e) => handleAnswerChange(e.target.value)}
            />
          )}

          {/* 2. Long Text / Textarea */}
          {question.question_type === "long_text" && (
            <textarea
              rows={4}
              className="mt-4 w-full rounded border p-3 text-sm focus:border-black focus:outline-none"
              placeholder="Type your detailed answer..."
              value={answers[question.id] || ""}
              onChange={(e) => handleAnswerChange(e.target.value)}
            />
          )}

          {/* 3. Email Input */}
          {question.question_type === "email" && (
            <input
              type="email"
              className="mt-4 w-full rounded border p-3 text-sm focus:border-black focus:outline-none"
              placeholder="name@example.com"
              value={answers[question.id] || ""}
              onChange={(e) => handleAnswerChange(e.target.value)}
            />
          )}

          {/* 4. Number Input */}
          {question.question_type === "number" && (
            <input
              type="number"
              className="mt-4 w-full rounded border p-3 text-sm focus:border-black focus:outline-none"
              placeholder="Enter a number..."
              value={answers[question.id] || ""}
              onChange={(e) => handleAnswerChange(e.target.value)}
            />
          )}

          {/* 5. Multiple Choice (Radio Buttons) */}
          {question.question_type === "multiple_choice" && (
            <div className="mt-4 space-y-2">
              {question.options && question.options.length > 0 ? (
                question.options.map((option) => (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center rounded border p-3 text-sm transition hover:bg-gray-50 ${
                      answers[question.id] === option.option_text
                        ? "border-black bg-gray-50"
                        : "border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={option.option_text}
                      checked={answers[question.id] === option.option_text}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      className="mr-3"
                    />
                    <span>{option.option_text}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-gray-500">No options configured.</p>
              )}
            </div>
          )}

          {/* 6. Dropdown */}
          {question.question_type === "dropdown" && (
            <select
              className="mt-4 w-full rounded border p-3 text-sm bg-white focus:border-black focus:outline-none"
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
            <div className="mt-4 flex gap-3">
              {[1, 2, 3, 4, 5].map((rating) => {
                const isSelected = answers[question.id] === String(rating);
                return (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => handleAnswerChange(String(rating))}
                    className={`h-12 w-12 rounded-lg border text-base font-semibold transition ${
                      isSelected
                        ? "bg-black text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {rating}
                  </button>
                );
              })}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex items-center justify-between border-t pt-6">
            {currentQuestion > 0 ? (
              <button
                type="button"
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                className="rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-gray-50"
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
                className="rounded-lg bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700"
              >
                Submit Form
              </button>
            )}
          </div>
        </div>

        {/* Current Answers Debug Box (simple state preview) */}
        <div className="mt-10 rounded-lg bg-gray-50 p-4 border border-gray-200">
          <h3 className="text-xs font-semibold uppercase text-gray-500">
            Current Answers Preview (State):
          </h3>
          <pre className="mt-1 text-xs text-gray-700 font-mono">
            {JSON.stringify(answers, null, 2)}
          </pre>
        </div>
      </div>
    </main>
  );
}