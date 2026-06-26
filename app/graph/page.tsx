"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Reading = {
  date: string;
  sys: number;
  dia: number;
  pulse: number;
};

export default function GraphPage() {
  const [readings, setReadings] = useState<Reading[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/readings")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Could not load readings.");
        }
        return res.json();
      })
      .then((data) => setReadings(data.readings))
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong."));
  }, []);

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black px-4">
      <main className="flex w-full max-w-2xl flex-col items-center gap-6 py-12">
        <h1 className="text-2xl font-semibold text-center text-black dark:text-zinc-50">
          Kim&apos;s Numbers for a Healthy and Happy Life 😊
        </h1>

        {error && <p className="text-center text-sm text-red-600">{error}</p>}

        {!error && readings === null && (
          <p className="text-zinc-600 dark:text-zinc-400">Loading readings…</p>
        )}

        {!error && readings !== null && readings.length === 0 && (
          <p className="text-zinc-600 dark:text-zinc-400">No readings saved yet.</p>
        )}

        {!error && readings !== null && readings.length > 0 && (
          <>
          <div className="h-[28rem] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={readings} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis
                  label={{
                    value: "mmHg / bpm",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontWeight: 700, fontSize: 18, textAnchor: "middle" },
                  }}
                />
                <Tooltip />
                <Line type="monotone" dataKey="sys" name="SYS" stroke="#dc2626" strokeWidth={3} />
                <Line type="monotone" dataKey="dia" name="DIA" stroke="#2563eb" strokeWidth={3} />
                <Line
                  type="monotone"
                  dataKey="pulse"
                  name="Pulse"
                  stroke="#16a34a"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-lg font-bold text-black dark:text-zinc-50">Date</p>
          <div className="flex items-center justify-center gap-6">
            <span className="flex items-center gap-2 text-lg font-bold" style={{ color: "#dc2626" }}>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "#dc2626" }} />
              SYS
            </span>
            <span className="flex items-center gap-2 text-lg font-bold" style={{ color: "#2563eb" }}>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "#2563eb" }} />
              DIA
            </span>
            <span className="flex items-center gap-2 text-lg font-bold" style={{ color: "#16a34a" }}>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "#16a34a" }} />
              Pulse
            </span>
          </div>
          </>
        )}

        <Link
          href="/"
          className="flex h-12 w-full items-center justify-center rounded-full bg-foreground text-base font-medium text-background"
        >
          Back
        </Link>
      </main>
    </div>
  );
}
