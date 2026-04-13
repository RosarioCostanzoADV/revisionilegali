"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const CATEGORY_LABELS: Record<string, string> = {
  contabilità: "Contabilità",
  governance: "Amministrazione e governance",
  adempimenti: "Adempimenti formali",
  controllo_interno: "Controllo interno",
  generale: "Generale",
};

interface VigilanzaItem {
  id: string;
  item: string;
  category: string;
  done: boolean;
  notes: string | null;
  completed_by: string | null;
  completed_at: string | null;
  sort_order: number;
}

export function VigilanzaSection({
  quarterId,
  initialItems,
  completedByNames,
}: {
  quarterId: string;
  initialItems: VigilanzaItem[];
  completedByNames: Record<string, string>;
}) {
  const [items, setItems] = useState<VigilanzaItem[]>(initialItems);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [newCategory, setNewCategory] = useState("generale");
  const [addingSaving, setAddingSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  async function loadTemplate() {
    setError(null);
    setLoadingTemplate(true);
    const res = await fetch("/api/tenant/vigilanza", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ load_template: true, quarter_id: quarterId }),
    });
    setLoadingTemplate(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Errore nel caricamento template.");
      return;
    }
    const listRes = await fetch(`/api/tenant/vigilanza?quarter_id=${quarterId}`);
    if (listRes.ok) setItems(await listRes.json());
  }

  async function toggleDone(item: VigilanzaItem) {
    setSavingId(item.id);
    const newDone = !item.done;
    await fetch(`/api/tenant/vigilanza/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: newDone }),
    });
    setSavingId(null);
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, done: newDone, completed_at: newDone ? new Date().toISOString() : null }
          : i,
      ),
    );
  }

  async function saveNotes(item: VigilanzaItem) {
    setSavingId(item.id);
    await fetch(`/api/tenant/vigilanza/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notesDraft || null }),
    });
    setSavingId(null);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, notes: notesDraft || null } : i)),
    );
    setEditingNotesId(null);
  }

  async function deleteItem(id: string) {
    await fetch(`/api/tenant/vigilanza/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.trim()) return;
    setAddingSaving(true);
    const res = await fetch("/api/tenant/vigilanza", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quarter_id: quarterId, item: newItem.trim(), category: newCategory, sort_order: 99 }),
    });
    setAddingSaving(false);
    if (res.ok) {
      const listRes = await fetch(`/api/tenant/vigilanza?quarter_id=${quarterId}`);
      if (listRes.ok) setItems(await listRes.json());
      setNewItem("");
      setShowAddForm(false);
    }
  }

  // Raggruppa per categoria
  const grouped = items.reduce<Record<string, VigilanzaItem[]>>((acc, item) => {
    const cat = item.category || "generale";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Checklist di vigilanza</h2>
          {total > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {doneCount}/{total} completate — {pct}%
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!showAddForm && (
            <Button type="button" variant="secondary" onClick={() => setShowAddForm(true)}>
              + Voce
            </Button>
          )}
          {items.length === 0 && (
            <Button type="button" loading={loadingTemplate} onClick={loadTemplate}>
              Carica checklist standard
            </Button>
          )}
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-1.5 w-full rounded-full bg-gray-100">
          <div
            className="h-1.5 rounded-full bg-brand-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Form aggiungi voce */}
      {showAddForm && (
        <form onSubmit={addItem} className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Descrizione voce..."
              autoFocus
              className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>Annulla</Button>
            <Button type="submit" loading={addingSaving}>Aggiungi</Button>
          </div>
        </form>
      )}

      {/* Lista vuota */}
      {items.length === 0 && !showAddForm && (
        <p className="text-sm text-gray-400">
          Nessuna voce. Carica la checklist standard o aggiungi voci manualmente.
        </p>
      )}

      {/* Checklist raggruppata per categoria */}
      {Object.entries(grouped).map(([category, catItems]) => (
        <div key={category}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {CATEGORY_LABELS[category] ?? category}
          </p>
          <ul className="space-y-1">
            {catItems.map((item) => (
              <li key={item.id} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    type="button"
                    disabled={savingId === item.id}
                    onClick={() => toggleDone(item)}
                    className={`mt-0.5 h-4 w-4 shrink-0 rounded border-2 transition-colors ${
                      item.done
                        ? "border-brand-500 bg-brand-500"
                        : "border-gray-300 bg-white hover:border-brand-400"
                    } disabled:opacity-50`}
                  >
                    {item.done && (
                      <svg viewBox="0 0 12 12" className="h-full w-full text-white" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${item.done ? "line-through text-gray-400" : "text-gray-800"}`}>
                      {item.item}
                    </p>

                    {/* Note */}
                    {editingNotesId === item.id ? (
                      <div className="mt-1.5 flex gap-2">
                        <input
                          type="text"
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          autoFocus
                          placeholder="Nota..."
                          className="h-7 flex-1 rounded border border-gray-300 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                        <button
                          type="button"
                          onClick={() => saveNotes(item)}
                          className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                        >
                          Salva
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingNotesId(null)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Annulla
                        </button>
                      </div>
                    ) : (
                      item.notes && (
                        <p className="mt-0.5 text-xs text-gray-500 italic">{item.notes}</p>
                      )
                    )}

                    {item.done && item.completed_at && (
                      <p className="mt-0.5 text-xs text-gray-400">
                        Completata {new Date(item.completed_at).toLocaleDateString("it-IT")}
                        {completedByNames[item.completed_by ?? ""] && ` · ${completedByNames[item.completed_by!]}`}
                      </p>
                    )}
                  </div>

                  {/* Azioni */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNotesId(item.id);
                        setNotesDraft(item.notes ?? "");
                      }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      {item.notes ? "Modifica nota" : "Nota"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteItem(item.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
