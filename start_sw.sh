#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$REPO_ROOT/docker"
FRONTEND_DIR="$REPO_ROOT/frontend"
FRONTEND_LOG="/tmp/revisionilegali-frontend.log"
FRONTEND_PORT=3000
GATEWAY_PORT=8080

# ── colori ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✔${NC}  $*"; }
info() { echo -e "${YELLOW}→${NC}  $*"; }
err()  { echo -e "${RED}✘${NC}  $*" >&2; }

# ── 1. Ferma il frontend se già in ascolto ──────────────────────────────────
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
docker compose down --remove-orphans 2>/dev/null || true
ok "Container fermati."

# ── 3. Build e avvio di tutti i servizi ─────────────────────────────────────
info "Build e avvio di tutti i servizi (--build)..."
docker compose up -d --build
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

# ── 6. Avvio frontend Next.js (dev) ─────────────────────────────────────────
info "Avvio frontend Next.js su http://localhost:$FRONTEND_PORT ..."
cd "$FRONTEND_DIR"
GATEWAY_URL="http://localhost:$GATEWAY_PORT" \
NEXT_PUBLIC_GATEWAY_URL="http://localhost:$GATEWAY_PORT" \
npm run dev -- --port "$FRONTEND_PORT" > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

# Attendi che Next.js sia pronto
for i in $(seq 1 30); do
  if grep -q "Ready in" "$FRONTEND_LOG" 2>/dev/null; then
    ok "Frontend pronto (PID $FRONTEND_PID)."
    break
  fi
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    err "Il processo frontend è uscito in modo inaspettato."
    err "Log: $FRONTEND_LOG"
    tail -20 "$FRONTEND_LOG" >&2
    exit 1
  fi
  if [ "$i" -eq 30 ]; then
    err "Timeout: il frontend non ha risposto in 60s."
    err "Log: $FRONTEND_LOG"
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
echo -e "  Frontend   → ${YELLOW}http://localhost:$FRONTEND_PORT${NC}"
echo -e "  Gateway    → ${YELLOW}http://localhost:$GATEWAY_PORT${NC}"
echo ""
echo -e "  Log frontend : $FRONTEND_LOG"
echo -e "  Log backend  : docker logs <nome-service>"
echo ""
echo -e "  Per fermare tutto:"
echo -e "    kill $FRONTEND_PID                      # frontend"
echo -e "    cd $DOCKER_DIR && docker compose down   # backend"
echo ""
