"use client";

import { useRef, useState } from "react";

type Reading = {
  sys: string;
  dia: string;
  pulse: string;
};

type Status = "idle" | "capturing" | "extracting" | "confirming" | "saving" | "saved" | "error";

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [reading, setReading] = useState<Reading>({ sys: "", dia: "", pulse: "" });
  const [errorMessage, setErrorMessage] = useState("");

  function handleTakePhoto() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setStatus("extracting");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not read the numbers from that photo.");
      }

      const data = await res.json();
      setReading({
        sys: data.sys ?? "",
        dia: data.dia ?? "",
        pulse: data.pulse ?? "",
      });
      setStatus("confirming");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  async function handleConfirm() {
    setStatus("saving");
    setErrorMessage("");

    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reading),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not save this reading.");
      }

      const data = await res.json();
      setStatus("saved");
      if (data.sheetUrl) {
        window.location.href = data.sheetUrl;
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  function handleReset() {
    setReading({ sys: "", dia: "", pulse: "" });
    setErrorMessage("");
    setStatus("idle");
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black px-4">
      <main className="flex w-full max-w-sm flex-col items-center gap-6 py-16">
        <h1 className="text-2xl font-semibold text-center text-black dark:text-zinc-50">
          Blood Pressure Tracker
        </h1>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelected}
        />

        {status === "idle" || status === "error" ? (
          <div className="flex w-full flex-col items-center gap-4">
            <button
              onClick={handleTakePhoto}
              className="flex h-14 w-full items-center justify-center rounded-full bg-foreground px-5 text-lg font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Add Reading
            </button>
            {status === "error" && (
              <p className="text-center text-sm text-red-600">{errorMessage}</p>
            )}
          </div>
        ) : null}

        {status === "extracting" && (
          <p className="text-zinc-600 dark:text-zinc-400">Reading the numbers from your photo…</p>
        )}

        {status === "confirming" && (
          <div className="flex w-full flex-col gap-4 rounded-2xl border border-black/[.08] p-5 dark:border-white/[.145]">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Check these numbers before saving:
            </p>

            <Field
              label="SYS (mmHg)"
              value={reading.sys}
              onChange={(v) => setReading((r) => ({ ...r, sys: v }))}
            />
            <Field
              label="DIA (mmHg)"
              value={reading.dia}
              onChange={(v) => setReading((r) => ({ ...r, dia: v }))}
            />
            <Field
              label="Pulse (bpm)"
              value={reading.pulse}
              onChange={(v) => setReading((r) => ({ ...r, pulse: v }))}
            />

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleReset}
                className="flex h-12 flex-1 items-center justify-center rounded-full border border-black/[.08] text-base font-medium dark:border-white/[.145]"
              >
                Retake
              </button>
              <button
                onClick={handleConfirm}
                className="flex h-12 flex-1 items-center justify-center rounded-full bg-foreground text-base font-medium text-background"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {status === "saving" && (
          <p className="text-zinc-600 dark:text-zinc-400">Saving to your sheet…</p>
        )}

        {status === "saved" && (
          <div className="flex w-full flex-col items-center gap-4">
            <p className="text-center text-base text-green-700 dark:text-green-400">
              Saved: {reading.sys}/{reading.dia} mmHg, pulse {reading.pulse}
            </p>
            <button
              onClick={handleReset}
              className="flex h-12 w-full items-center justify-center rounded-full bg-foreground text-base font-medium text-background"
            >
              Add Another Reading
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-lg border border-black/[.08] px-3 text-lg dark:border-white/[.145] dark:bg-zinc-900"
      />
    </label>
  );
}
