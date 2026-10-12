#!/usr/bin/env bash
set -euo pipefail
base='https://ai-yangmao.com/ai-yangmao-public'
target="${HOME}/.agents/skills/ai-yangmao-public"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) target="${2:?--dir requires a directory}"; shift 2 ;;
    --base-url) base="${2:?--base-url requires a URL}"; shift 2 ;;
    *) echo "Usage: install.sh [--dir DIRECTORY] [--base-url URL]" >&2; exit 2 ;;
  esac
done
case "$base" in https://*|http://127.0.0.1:*|http://localhost:*) ;; *) echo 'Use HTTPS, or localhost for testing.' >&2; exit 2 ;; esac
command -v curl >/dev/null || { echo 'curl is required.' >&2; exit 2; }
if command -v sha256sum >/dev/null; then checksum=(sha256sum -c);
elif command -v shasum >/dev/null; then checksum=(shasum -a 256 -c);
else echo 'sha256sum or shasum is required.' >&2; exit 2; fi
target=${target%/}
[[ -n "$target" ]] || { echo 'Choose a skill directory, not the filesystem root.' >&2; exit 2; }
parent=$(dirname "$target")
mkdir -p "$parent"
lock="$target.install-lock"
if ! mkdir "$lock" 2>/dev/null; then
  echo "Installation lock exists: $lock. Retry after the other installer exits. If it was killed, verify the PID in $lock/pid is no longer running before removing the stale lock." >&2
  exit 75
fi
printf '%s\n' "$$" > "$lock/pid"
stage=''; backup=''
cleanup() {
  status=$?
  if [[ $status -ne 0 && -n "$backup" && ! -e "$target" ]]; then
    mv "$backup" "$target" || echo "Restore the previous skill from: $backup" >&2
  fi
  [[ -z "$stage" ]] || rm -rf "$stage"
  rm -f "$lock/pid"; rmdir "$lock" 2>/dev/null || true
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
if [[ -L "$target" ]]; then echo 'Refusing to replace a symlink; choose its actual skill directory with --dir.' >&2; exit 2; fi
if [[ -e "$target" ]]; then
  if [[ ! -f "$target/SKILL.md" ]] || [[ "$(sed -n 's/^name: *//p' "$target/SKILL.md")" != 'ai-yangmao-public' ]]; then
    echo 'The target belongs to another skill; choose another --dir.' >&2; exit 2
  fi
fi
stage=$(mktemp -d "$parent/.ai-yangmao-public.XXXXXX")
mkdir -p "$stage/pkg/agents"
for file in SKILL.md LICENSE agents/openai.yaml manifest.sha256; do
  curl --fail --silent --show-error --location --proto-redir '=https' --connect-timeout 10 --max-time 30 --retry 2 "$base/$file" -o "$stage/pkg/$file"
done
count=0; seen='|'
while read -r hash file; do
  [[ "$hash" =~ ^[0-9a-f]{64}$ ]] || { echo 'Invalid package checksum.' >&2; exit 1; }
  case "$file" in SKILL.md|LICENSE|agents/openai.yaml) ;; *) echo 'Unexpected package file.' >&2; exit 1 ;; esac
  case "$seen" in *"|$file|"*) echo 'Duplicate package file.' >&2; exit 1 ;; esac
  seen="$seen$file|"
  count=$((count+1))
done < "$stage/pkg/manifest.sha256"
[[ $count -eq 3 ]] || { echo 'Incomplete package manifest.' >&2; exit 1; }
(cd "$stage/pkg" && "${checksum[@]}" manifest.sha256)
[[ "$(sed -n 's/^name: *//p' "$stage/pkg/SKILL.md")" == 'ai-yangmao-public' ]] || { echo 'Unexpected skill identity.' >&2; exit 1; }
if [[ -e "$target" ]]; then backup="$target.backup.$(date +%Y%m%d%H%M%S).$$"; mv "$target" "$backup"; fi
mv "$stage/pkg" "$target"
echo "Installed: $target"
echo 'MCP (optional): https://ai-yangmao.com/api/mcp'
