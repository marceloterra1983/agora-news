#!/usr/bin/env bash
# Copy the newest encrypted snapshot to the dedicated Google Drive folder.
set -Eeuo pipefail
umask 077
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

BACKUP_ROOT="/home/marce/backups/news"
REMOTE_NAME="${BACKUP_DRIVE_REMOTE_NAME:-gdrive}"
REMOTE="${REMOTE_NAME}:"
RETENTION_COUNT=30

command -v rclone >/dev/null 2>&1 || {
  printf 'drive backup dependency missing: rclone\n' >&2
  exit 1
}
command -v sha256sum >/dev/null 2>&1 || {
  printf 'drive backup dependency missing: sha256sum\n' >&2
  exit 1
}

rclone listremotes | grep -Fxq "${REMOTE_NAME}:" || {
  printf 'drive remote missing: %s\n' "$REMOTE_NAME" >&2
  exit 1
}

mapfile -t snapshots < <(
  find -P "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d \
    -name '20??????T??????Z' -printf '%f\n' | sort
)
((${#snapshots[@]} > 0)) || {
  printf 'no complete local snapshot found\n' >&2
  exit 1
}

latest="${snapshots[${#snapshots[@]}-1]}"
source_dir="$BACKUP_ROOT/$latest"
test -f "$source_dir/SHA256SUMS"
sha256sum -c "$source_dir/SHA256SUMS" >/dev/null

destination="$latest"
if rclone lsd "$REMOTE$destination" >/dev/null 2>&1; then
  destination="${latest}-full"
fi

rclone copy "$source_dir" "$REMOTE$destination" \
  --immutable --checkers=4 --transfers=2
rclone check "$source_dir" "$REMOTE$destination" --one-way

mapfile -t remote_snapshots < <(
  rclone lsf "$REMOTE" --dirs-only --max-depth 1 2>/dev/null \
    | sed 's#/$##' \
    | grep -E '^20[0-9]{6}T[0-9]{6}Z(-full)?$' \
    | sort
)
if ((${#remote_snapshots[@]} > RETENTION_COUNT)); then
  for name in "${remote_snapshots[@]:0:${#remote_snapshots[@]}-RETENTION_COUNT}"; do
    rclone purge "$REMOTE$name"
  done
fi

printf 'drive backup complete: %s/%s\n' "$REMOTE_NAME" "$destination"
