# ============================================================================
# Bootstrap a fresh developer environment.
#   1. Copy .env.example to .env (if missing).
#   2. Run pnpm install at the workspace root.
#   3. Generate the Prisma client.
#   4. Print next steps.
# ============================================================================
set -euo pipefail

if [ ! -f .env ]; then
  cp .env.example .env
  echo "[bootstrap] Created .env from .env.example"
fi

echo "[bootstrap] pnpm install..."
pnpm install

echo "[bootstrap] Prisma generate..."
pnpm prisma:generate

cat <<EOF

[bootstrap] Done.

Next steps:
  pnpm dev                          # start all apps (turbo)
  docker compose up -d --build      # or full Docker

EOF
