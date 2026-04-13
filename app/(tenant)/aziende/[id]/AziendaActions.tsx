"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function AziendaActions({
  companyId,
  isArchived,
}: {
  companyId: string;
  isArchived: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleArchive() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/tenant/companies/${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: !isArchived }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Errore durante l'operazione.");
      return;
    }
    window.location.reload();
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      {error && <Alert variant="error">{error}</Alert>}
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Azioni</h2>
      <Button
        variant={isArchived ? "primary" : "secondary"}
        loading={loading}
        onClick={toggleArchive}
      >
        {isArchived ? "Ripristina azienda" : "Archivia azienda"}
      </Button>
      {!isArchived && (
        <p className="mt-2 text-xs text-gray-400">
          Archiviando l&apos;azienda non sarà più visibile nella lista principale.
        </p>
      )}
    </div>
  );
}
