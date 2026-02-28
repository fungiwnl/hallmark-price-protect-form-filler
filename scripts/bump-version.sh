#!/usr/bin/env bash
set -euo pipefail

MODE="patch"
WRITE_CHANGES=1

usage() {
  cat <<'USAGE'
Usage: scripts/bump-version.sh [--mode patch|minor|major] [--dry-run|--write]

Options:
  --mode      Version segment to bump (default: patch)
  --dry-run   Print next version without modifying files
  --write     Update package.json and manifest.json (default)
  -h, --help  Show this help text
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --dry-run)
      WRITE_CHANGES=0
      shift
      ;;
    --write)
      WRITE_CHANGES=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "$MODE" != "patch" && "$MODE" != "minor" && "$MODE" != "major" ]]; then
  echo "Invalid mode: $MODE" >&2
  exit 1
fi

extract_version() {
  local file="$1"
  sed -nE 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"([0-9]+\.[0-9]+\.[0-9]+)".*/\1/p' "$file" | head -n1
}

update_file_version() {
  local file="$1"
  local new_version="$2"
  local tmp
  tmp="$(mktemp)"

  if ! awk -v new_version="$new_version" '
    BEGIN { updated = 0 }
    {
      if (!updated && $0 ~ /"version"[[:space:]]*:[[:space:]]*"[0-9]+\.[0-9]+\.[0-9]+"/) {
        sub(/"version"[[:space:]]*:[[:space:]]*"[0-9]+\.[0-9]+\.[0-9]+"/, "\"version\": \"" new_version "\"")
        updated = 1
      }
      print
    }
    END {
      if (!updated) {
        exit 2
      }
    }
  ' "$file" > "$tmp"; then
    rm -f "$tmp"
    echo "Failed to update version in $file" >&2
    exit 1
  fi

  mv "$tmp" "$file"
}

PACKAGE_VERSION="$(extract_version package.json)"
MANIFEST_VERSION="$(extract_version manifest.json)"

if [[ -z "$PACKAGE_VERSION" || -z "$MANIFEST_VERSION" ]]; then
  echo "Could not read version from package.json or manifest.json" >&2
  exit 1
fi

if [[ "$PACKAGE_VERSION" != "$MANIFEST_VERSION" ]]; then
  echo "Version mismatch: package.json=$PACKAGE_VERSION manifest.json=$MANIFEST_VERSION" >&2
  exit 1
fi

IFS='.' read -r MAJOR MINOR PATCH <<< "$PACKAGE_VERSION"

case "$MODE" in
  patch)
    PATCH=$((PATCH + 1))
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
esac

NEXT_VERSION="${MAJOR}.${MINOR}.${PATCH}"

if [[ "$WRITE_CHANGES" -eq 1 ]]; then
  update_file_version package.json "$NEXT_VERSION"
  update_file_version manifest.json "$NEXT_VERSION"
fi

printf '%s\n' "$NEXT_VERSION"
