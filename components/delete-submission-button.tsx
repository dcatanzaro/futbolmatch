"use client";

import { useState } from "react";

type DeleteSubmissionButtonProps = {
  adminPassword: string;
  id: number;
};

export function DeleteSubmissionButton({ adminPassword, id }: DeleteSubmissionButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(`Borrar submission #${id}?`);
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch("/api/admin/submissions/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword, id }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error || "No se pudo borrar la submission.");
      }

      window.location.reload();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "No se pudo borrar la submission.",
      );
      setIsDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="rounded-full border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isDeleting ? "Borrando..." : "Borrar"}
    </button>
  );
}
