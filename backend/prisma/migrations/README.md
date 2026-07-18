## Prisma Migrations Lock File
# This directory holds all migration SQL files.
# - Each folder = one migration (named by timestamp + description)
# - The schema engine tracks which migrations have been applied in the DB
#
# For teammates:
#   npx prisma migrate deploy   ← applies pending migrations (safe for shared DB)
#   npx prisma db seed          ← loads demo data
#   npx prisma db push          ← if migrate dev fails (Neon direct-URL issue)
