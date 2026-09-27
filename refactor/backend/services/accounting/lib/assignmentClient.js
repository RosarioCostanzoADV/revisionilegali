'use strict';

/**
 * Client HTTP verso l'assignment-service (rete Docker interna).
 * Serve a sapere, per il trimestre in revisione, di quale trimestre (1-4) si tratta
 * e quali sono i trimestri "fratelli" dello stesso incarico — necessario per il
 * 4° trimestre, la cui revisione dipende dal completamento dei precedenti.
 */

const ASSIGNMENT_SERVICE_URL = process.env.ASSIGNMENT_SERVICE_URL || 'http://assignment-service:3004';

/** Dettaglio di un trimestre (numero, stato, assignment_id, bilancio_skipped). */
async function getQuarter(quarterId, token) {
  const url = `${ASSIGNMENT_SERVICE_URL}/api/quarters/${quarterId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`assignment-service quarter ${res.status}`);
  }
  return res.json();
}

/** Tutti i trimestri dello stesso incarico, ordinati 1→4. */
async function listQuarters(assignmentId, token) {
  const url = `${ASSIGNMENT_SERVICE_URL}/api/assignments/${assignmentId}/quarters`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`assignment-service quarters ${res.status}`);
  }
  return res.json();
}

/** Flag "non applicabile" per categoria — scope: intero incarico, non il singolo trimestre. */
async function getCategoryFlags(assignmentId, token) {
  const url = `${ASSIGNMENT_SERVICE_URL}/api/assignments/${assignmentId}/category-flags`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`assignment-service category-flags ${res.status}`);
  }
  return res.json();
}

/** Dettaglio incarico (serve a sapere il tipo: revisione_legale / collegio_sindacale / sindaco_unico). */
async function getAssignment(assignmentId, token) {
  const url = `${ASSIGNMENT_SERVICE_URL}/api/assignments/${assignmentId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`assignment-service assignment ${res.status}`);
  }
  return res.json();
}

module.exports = { getQuarter, listQuarters, getCategoryFlags, getAssignment };
