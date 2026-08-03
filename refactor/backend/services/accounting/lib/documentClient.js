'use strict';

/**
 * Client HTTP verso il document-service (rete Docker interna).
 * Inoltra il token utente per rispettare l'isolamento tenant.
 */

const DOCUMENT_SERVICE_URL = process.env.DOCUMENT_SERVICE_URL || 'http://document-service:3006';

/** Elenca i documenti di un trimestre. */
async function listDocuments(quarterId, token) {
  const url = `${DOCUMENT_SERVICE_URL}/api/documents?quarter_id=${encodeURIComponent(quarterId)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`document-service list ${res.status}`);
  }
  return res.json();
}

/** Scarica il contenuto binario di un documento come Buffer. */
async function downloadDocument(id, token) {
  const url = `${DOCUMENT_SERVICE_URL}/api/documents/${id}/download`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`document-service download ${res.status}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

module.exports = { listDocuments, downloadDocument };
