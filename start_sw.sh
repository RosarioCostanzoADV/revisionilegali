#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$REPO_ROOT/docker"
FRONTEND_PORT=3000
GATEWAY_PORT=8080

# Il frontend gira in container in modalità dev (hot-reload sul sorgente montato):
# docker-compose.dev.yml sovrascrive lo stage di build e monta ../frontend in /app.
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.dev.yml)

# ── colori ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✔${NC}  $*"; }
info() { echo -e "${YELLOW}→${NC}  $*"; }
err()  { echo -e "${RED}✘${NC}  $*" >&2; }

# ── 1. Ferma eventuali frontend avviati a mano sull'host ────────────────────
# Il frontend ora è containerizzato e pubblica su 127.0.0.1:$FRONTEND_PORT.
# Un `npm run dev` lasciato attivo sull'host occuperebbe la stessa porta.
info "Verifica frontend su porta $FRONTEND_PORT..."
if lsof -ti tcp:"$FRONTEND_PORT" &>/dev/null; then
  info "Processo già attivo su :$FRONTEND_PORT — lo fermo."
  kill "$(lsof -ti tcp:"$FRONTEND_PORT")" 2>/dev/null || true
  sleep 1
fi
ok "Porta $FRONTEND_PORT libera."

# ── 2. Ferma i container del progetto (se attivi) ───────────────────────────
info "Fermo i container docker-compose esistenti..."
cd "$DOCKER_DIR"
"${COMPOSE[@]}" down --remove-orphans 2>/dev/null || true
ok "Container fermati."

# ── 3. Build e avvio di tutti i servizi (frontend incluso) ──────────────────
info "Build e avvio di tutti i servizi (--build)..."
"${COMPOSE[@]}" up -d --build
ok "Tutti i container avviati."

# ── 4. Attendi che auth-service sia pronto ──────────────────────────────────
info "Attendo auth-service (max 60s)..."
for i in $(seq 1 30); do
  if docker logs auth-service 2>&1 | grep -q "auth-service running on port"; then
    ok "auth-service pronto."
    break
  fi
  if [ "$i" -eq 30 ]; then
    err "Timeout: auth-service non ha risposto in 60s."
    err "Controlla i log con: docker logs auth-service"
    exit 1
  fi
  sleep 2
done

# ── 5. Smoke-test del gateway ────────────────────────────────────────────────
info "Smoke-test API gateway (http://localhost:$GATEWAY_PORT)..."
for i in $(seq 1 10); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "http://localhost:$GATEWAY_PORT/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"smoke@test.local","password":"__probe__"}' 2>/dev/null || echo "000")
  if [ "$STATUS" = "401" ] || [ "$STATUS" = "400" ]; then
    ok "Gateway risponde (HTTP $STATUS — atteso)."
    break
  fi
  if [ "$i" -eq 10 ]; then
    err "Gateway non raggiungibile dopo 20s (ultimo status: $STATUS)."
    exit 1
  fi
  sleep 2
done

# ── 6. Attendi il frontend Next.js (container, dev mode) ────────────────────
info "Attendo il frontend Next.js (max 90s)..."
for i in $(seq 1 45); do
  if docker logs frontend 2>&1 | grep -q "Ready in"; then
    ok "Frontend pronto (hot-reload attivo sul sorgente)."
    break
  fi
  if [ "$(docker inspect -f '{{.State.Running}}' frontend 2>/dev/null)" != "true" ]; then
    err "Il container frontend è uscito in modo inaspettato."
    err "Log: docker logs frontend"
    docker logs --tail 20 frontend >&2 2>&1
    exit 1
  fi
  if [ "$i" -eq 45 ]; then
    err "Timeout: il frontend non ha risposto in 90s."
    err "Log: docker logs frontend"
    exit 1
  fi
  sleep 2
done

# ── 7. Riepilogo ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Stack avviato con successo!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  App        → ${YELLOW}http://localhost:$GATEWAY_PORT${NC}  (gateway + frontend)"
echo -e "  Frontend   → ${YELLOW}http://localhost:$FRONTEND_PORT${NC}  (diretto, bypassa il gateway)"
echo ""
echo -e "  Il frontend gira in dev mode: le modifiche al sorgente si applicano"
echo -e "  a caldo, senza rebuild."
echo ""
echo -e "  Log          : docker logs -f <nome-service>   (es. frontend, ai-service)"
echo ""
echo -e "  Per fermare tutto:"
echo -e "    cd $DOCKER_DIR && docker compose -f docker-compose.yml -f docker-compose.dev.yml down"
echo ""
