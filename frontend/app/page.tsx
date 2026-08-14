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

export default function Home() {
  const [forms, setForms] = useState<Form[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/forms/`)
      .then((response) => response.json())
      .then((data) => {
        setForms(data);
      })
      .catch((error) => {
        console.error("Error fetching forms:", error);
      });
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              My Forms
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Overview of all your created forms.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Go to Dashboard
          </Link>
        </div>

        <div className="mt-6 space-y-4">
          {forms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-sm text-slate-500">No forms available yet.</p>
            </div>
          ) : (
            forms.map((form) => (
              <div
                key={form.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {form.title}
                  </h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    {form.status}
                  </span>
                </div>

                {form.description && (
                  <p className="mt-1 text-sm text-slate-600">
                    {form.description}
                  </p>
                )}

                <div className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-500">
                  Responses: {form.response_count}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}