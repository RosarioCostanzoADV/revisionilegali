"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { NuovoUtenteForm } from "./NuovoUtenteForm";
import { UserActions } from "./UserActions";

interface User {
  id: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface Props {
  initialUsers: User[];
  canManage: boolean;
  roleLabels: Record<string, string>;
  activeCount: number;
  maxUsers: number | null;
}

export function UsersClient({ initialUsers, canManage, roleLabels, activeCount, maxUsers }: Props) {
  const [showForm, setShowForm] = useState(false);

  function handleDone() {
    setShowForm(false);
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      {/* Header con contatore */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {activeCount} utenti attivi{maxUsers ? ` su ${maxUsers} inclusi nel piano` : ""}
        </p>
        {canManage && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            + Aggiungi utente
          </Button>
        )}
      </div>

      {/* Form nuovo utente */}
      {showForm && <NuovoUtenteForm onDone={handleDone} />}

      {/* Tabella utenti */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Nome", "Ruolo", "Stato", ...(canManage ? ["Azioni"] : [])].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {initialUsers.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {u.full_name ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {roleLabels[u.role] ?? u.role}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                  }`}>
                    {u.is_active ? "Attivo" : "Inattivo"}
                  </span>
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <UserActions user={u} onDone={handleDone} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
