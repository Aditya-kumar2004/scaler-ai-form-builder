"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Answer {
  id: number;
  question: number;
  question_text?: string;
  answer_text: string;
}

interface FormResponse {
  id: number;
  form: number;
  submitted_at: string;
  answers: Answer[];
}

interface Form {
  id: number;
  title: string;
  description: string;
  status: string;
  response_count?: number;
}

export default function FormResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(
    null
  );

  useEffect(() => {
    async function loadData() {
      const { id } = await params;

      try {
        // 1. Fetch form info
        const formRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/forms/${id}/`
        );
        if (formRes.ok) {
          const formData = await formRes.json();
          setForm(formData);
        }

        // 2. Fetch responses list
        const respRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/forms/${id}/responses/`
        );
        if (respRes.ok) {
          const respData = await respRes.json();
          setResponses(Array.isArray(respData) ? respData : []);
        }
      } catch (error) {
        console.error("Error loading responses:", error);
      }

      setLoading(false);
    }

    loadData();
  }, [params]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-10">
        <p className="text-center text-gray-500">Loading responses...</p>
      </main>
    );
  }

  if (!form) {
    return (
      <main className="min-h-screen bg-gray-50 p-10">
        <div className="mx-auto max-w-xl rounded-lg bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold">Form Not Found</h1>
          <Link href="/dashboard" className="mt-4 inline-block text-blue-600 underline">
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 sm:p-10 text-gray-900">
      <div className="mx-auto max-w-5xl">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
          <div>
            <Link
              href="/dashboard"
              className="text-xs font-medium text-gray-500 hover:text-gray-800 transition"
            >
              &larr; Back to Dashboard
            </Link>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold">{form.title}</h1>
            <p className="mt-1 text-sm text-gray-600">
              Viewing submitted responses and results.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/forms/${form.id}/builder`}
              className="rounded-lg border bg-white px-3.5 py-2 text-xs font-medium hover:bg-gray-50 shadow-sm"
            >
              Builder
            </Link>
            <Link
              href={`/forms/${form.id}`}
              target="_blank"
              className="rounded-lg bg-black px-3.5 py-2 text-xs font-medium text-white hover:bg-gray-800 shadow-sm"
            >
              Open Form
            </Link>
          </div>
        </div>

        {/* Stats Card */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Total Submissions
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {responses.length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Form Status
            </p>
            <span
              className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                form.status === "published"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {form.status}
            </span>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Last Response
            </p>
            <p className="mt-2 text-sm text-gray-700 font-medium">
              {responses.length > 0
                ? new Date(responses[0].submitted_at).toLocaleDateString() +
                  " " +
                  new Date(responses[0].submitted_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "No responses yet"}
            </p>
          </div>
        </div>

        {/* Responses Table / List */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">
            All Submissions ({responses.length})
          </h2>

          {responses.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed bg-white p-12 text-center text-gray-500">
              No responses have been submitted for this form yet.
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                  <tr>
                    <th className="px-6 py-3.5">#</th>
                    <th className="px-6 py-3.5">Submitted At</th>
                    <th className="px-6 py-3.5">Answers Preview</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {responses.map((resp, idx) => (
                    <tr key={resp.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-xs">
                        {new Date(resp.submitted_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-700 max-w-md truncate">
                        {resp.answers && resp.answers.length > 0
                          ? resp.answers
                              .map((a) => `${a.question_text || "Answer"}: ${a.answer_text}`)
                              .join(" • ")
                          : "Empty response"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedResponse(resp)}
                          className="rounded border px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 transition"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Full Response Modal Detail View */}
        {selectedResponse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Response Details #{selectedResponse.id}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Submitted on {new Date(selectedResponse.submitted_at).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedResponse(null)}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Answers List */}
              <div className="mt-6 space-y-4">
                {selectedResponse.answers && selectedResponse.answers.length > 0 ? (
                  selectedResponse.answers.map((ans, idx) => (
                    <div
                      key={ans.id || idx}
                      className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                    >
                      <p className="text-xs font-semibold text-gray-500 uppercase">
                        Question {idx + 1}
                      </p>
                      <h4 className="mt-1 text-sm font-semibold text-gray-800">
                        {ans.question_text || `Question ID: ${ans.question}`}
                      </h4>
                      <p className="mt-2 text-sm text-gray-900 bg-white rounded border p-2.5 font-medium">
                        {ans.answer_text || "(No answer provided)"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No answers recorded.</p>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedResponse(null)}
                  className="rounded-lg bg-black px-5 py-2 text-xs font-medium text-white hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
