#!/usr/bin/env bash
# Daily encrypted production snapshot for the host cron.
set -Eeuo pipefail
umask 077
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

APP_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_ROOT="/home/marce/backups/news"
AGE_IDENTITY="/home/marce/.config/age/news-backup-key.txt"
RETENTION_COUNT=30

require() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'backup dependency missing: %s\n' "$1" >&2
    exit 1
  }
}

for tool in age age-keygen docker find flock git gzip install node pg_dump pg_restore sha256sum; do
  require "$tool"
done

test -f "$APP_ROOT/.env" || {
  printf 'backup source missing: %s/.env\n' "$APP_ROOT" >&2
  exit 1
}
test -f "$AGE_IDENTITY" || {
  printf 'backup age identity missing: %s\n' "$AGE_IDENTITY" >&2
  exit 1
}

install -d -m 700 "$BACKUP_ROOT"
exec 9>"$BACKUP_ROOT/.backup.lock"
if ! flock -n 9; then
  printf 'backup already running; skipping\n'
  exit 0
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
final="$BACKUP_ROOT/$timestamp"
staging="$BACKUP_ROOT/.$timestamp.partial"
test ! -e "$final"
test ! -e "$staging"
install -d -m 700 "$staging"

finish() {
  status=$?
  if ((status != 0)) && [[ -d "$staging" ]]; then
    printf 'backup failed; partial snapshot kept at %s\n' "$staging" >&2
  fi
  exit "$status"
}
trap finish EXIT

recipient="$(age-keygen -y "$AGE_IDENTITY")"
[[ "$recipient" == age1* ]] || {
  printf 'invalid age recipient\n' >&2
  exit 1
}
printf '%s\n' "$recipient" > "$staging/.env.age.recipient"
age -r "$recipient" -o "$staging/.env.age" "$APP_ROOT/.env"

BACKUP_DUMP="$staging/postgres.dump" node --env-file="$APP_ROOT/.env" --input-type=module <<'NODE'
import { spawnSync } from "node:child_process";

const url = new URL(process.env.DATABASE_URL);
const env = {
  ...process.env,
  PGHOST: url.hostname,
  PGPORT: url.port || "5432",
  PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password),
  PGDATABASE: decodeURIComponent(url.pathname.replace(/^\/+/, "")) || "postgres",
  PGSSLMODE: url.searchParams.get("sslmode") || "require",
  PGCONNECT_TIMEOUT: "30",
};
delete env.DATABASE_URL;

const result = spawnSync(
  "pg_dump",
  ["--format=custom", "--no-owner", "--no-acl", "--file", process.env.BACKUP_DUMP],
  { env, stdio: ["ignore", "inherit", "inherit"], timeout: 300_000, killSignal: "SIGTERM" },
);
if (result.error) {
  console.error(result.error.code === "ETIMEDOUT" ? "pg_dump_timeout" : "pg_dump_failed");
  process.exit(1);
}
process.exit(result.status ?? 1);
NODE

test -s "$staging/postgres.dump"
pg_restore --list "$staging/postgres.dump" > "$staging/postgres.manifest.txt"
pg_restore --schema-only --no-owner --no-acl --exit-on-error --file=/dev/null "$staging/postgres.dump"

git -C "$APP_ROOT" bundle create "$staging/news.bundle" --all >/dev/null
git -C "$APP_ROOT" bundle verify "$staging/news.bundle" > "$staging/git-bundle.verify.txt"

docker image inspect news-news:latest >/dev/null
docker image inspect news-news:latest --format '{{.Id}}' > "$staging/docker-image-id.txt"
docker image inspect news-news:latest --format '{{.RepoDigests}}' > "$staging/docker-image-digests.txt"
docker compose -f "$APP_ROOT/compose.yml" ps > "$staging/docker-compose.ps.txt"
docker save news-news:latest | gzip -c > "$staging/news-image.tar.gz"
test -s "$staging/news-image.tar.gz"

cp --preserve=mode "$APP_ROOT/compose.yml" "$staging/compose.yml"
cp --preserve=mode "$APP_ROOT/Dockerfile" "$staging/Dockerfile"
cp --preserve=mode "$APP_ROOT/docs/production-runbook.md" "$staging/production-runbook.md"
CRON_WRAPPER="/home/marce/ops/scripts/cron-alert-wrap.sh"
test -r "$CRON_WRAPPER"
cp --preserve=mode "$CRON_WRAPPER" "$staging/cron-alert-wrap.sh"
crontab -l > "$staging/crontab.txt"

original_env_hash="$(sha256sum "$APP_ROOT/.env" | awk '{print $1}')"
restored_env_hash="$(age -d -i "$AGE_IDENTITY" "$staging/.env.age" | sha256sum | awk '{print $1}')"
test "$original_env_hash" = "$restored_env_hash"
printf 'env_restore_check=ok\n' > "$staging/env-restore-check.txt"
{
  printf '%s\n' "backup_root=$final"
  printf '%s\n' 'database_dump=ok'
  printf '%s\n' 'git_bundle=ok'
  printf '%s\n' 'docker_image=ok'
  printf '%s\n' 'env_encryption=ok'
  printf '%s\n' 'restore_hash_check=ok'
  printf '%s\n' 'cron_schedule=ok'
  printf '%s\n' 'cron_alert_wrapper=ok'
} > "$staging/backup-summary.txt"

find "$staging" -maxdepth 1 -type f ! -name SHA256SUMS -printf '%p\n' | sort | xargs sha256sum > "$staging/SHA256SUMS"
sha256sum -c "$staging/SHA256SUMS" >/dev/null
mv -- "$staging" "$final"
chmod 700 "$final"

mapfile -t snapshots < <(
  find -P "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20??????T??????Z' -printf '%f\n' | sort
)
if ((${#snapshots[@]} > RETENTION_COUNT)); then
  for name in "${snapshots[@]:0:${#snapshots[@]}-RETENTION_COUNT}"; do
    [[ "$name" =~ ^20[0-9]{6}T[0-9]{6}Z$ ]] || continue
    target="$BACKUP_ROOT/$name"
    test -d "$target" || continue
    test ! -L "$target" || continue
    test -f "$target/SHA256SUMS" || continue
    rm -r --one-file-system -- "$target"
  done
fi

printf 'backup complete: %s\n' "$final"
