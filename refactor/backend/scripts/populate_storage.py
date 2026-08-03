#!/usr/bin/env python3
"""
Copia i file reali da fwdprimotrimestre/ nel volume Docker del document-service.
Per ogni documento nel DB, cerca il file corrispondente per nome e lo copia
nel container a /app/storage/<file_path>.
"""

import os
import subprocess
import psycopg2

DOCUMENT_DB = "postgresql://postgres:postgres@localhost:5438/document_db"
FWDROOT = "/Users/juliocesarplascenciabierd/revisionilegali/fwdprimotrimestre"
CONTAINER = "document-service"

# Crea un PDF placeholder minimale (1 pagina bianca, valida)
PLACEHOLDER_PDF = b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj
xref
0 4
0000000000 65535 f\r
0000000009 00000 n\r
0000000058 00000 n\r
0000000115 00000 n\r
trailer<</Size 4/Root 1 0 R>>
startxref
190
%%EOF"""

def build_file_index(root):
    """Costruisce un indice {nome_file_lower: path_assoluto}"""
    index = {}
    for dirpath, _, files in os.walk(root):
        for f in files:
            index[f.lower()] = os.path.join(dirpath, f)
    return index

def extract_original_name(doc_name):
    """Estrae il nome file base dal nome documento (prima di ' — ' o ' -')"""
    for sep in [" — ", " - ", "—"]:
        if sep in doc_name:
            return doc_name.split(sep)[0].strip()
    return doc_name

def copy_to_container(local_path, container_path):
    container_dir = os.path.dirname(f"/app/storage/{container_path}")
    subprocess.run(
        ["docker", "exec", CONTAINER, "mkdir", "-p", container_dir],
        check=True, capture_output=True
    )
    subprocess.run(
        ["docker", "cp", local_path, f"{CONTAINER}:/app/storage/{container_path}"],
        check=True, capture_output=True
    )

def write_placeholder(container_path):
    tmp = f"/tmp/placeholder_{os.path.basename(container_path)}"
    with open(tmp, "wb") as f:
        f.write(PLACEHOLDER_PDF)
    copy_to_container(tmp, container_path)
    os.unlink(tmp)

def main():
    conn = psycopg2.connect(DOCUMENT_DB)
    cur = conn.cursor()
    cur.execute("SELECT id, name, file_path, mime_type FROM documents WHERE file_path != ''")
    docs = cur.fetchall()
    cur.close()
    conn.close()

    print(f"Documenti nel DB: {len(docs)}")
    idx = build_file_index(FWDROOT)

    copied = 0
    placeholder = 0
    for doc_id, name, file_path, mime_type in docs:
        original = extract_original_name(name)
        match = idx.get(original.lower())

        if match:
            try:
                copy_to_container(match, file_path)
                print(f"  ✓  {original[:60]}")
                copied += 1
            except subprocess.CalledProcessError as e:
                print(f"  ✗  ERRORE copia {original}: {e.stderr}")
        else:
            # Placeholder solo per PDF; i .doc non hanno anteprima comunque
            if mime_type == "application/pdf":
                write_placeholder(file_path)
                print(f"  ~  placeholder: {original[:60]}")
                placeholder += 1
            else:
                # File non-PDF: crea un file vuoto con estensione corretta
                ext = ".doc" if "word" in (mime_type or "") else ".bin"
                tmp = f"/tmp/empty{ext}"
                open(tmp, "w").close()
                copy_to_container(tmp, file_path)
                print(f"  ~  placeholder doc: {original[:60]}")
                placeholder += 1

    print(f"\nDone: {copied} file reali, {placeholder} placeholder")

if __name__ == "__main__":
    main()
