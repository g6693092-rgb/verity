#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || -z "$1" ]]; then
  echo "Usage: $0 <registry>/<org>"
  echo "Example: $0 ghcr.io/my-org"
  exit 1
fi

registry="$1"
mapfile -t files < <(find helm k8s -type f \( -name '*.yaml' -o -name '*.yml' \) -print 2>/dev/null)

if [[ ${#files[@]} -eq 0 ]]; then
  echo "No Helm or Kustomize manifests found."
  exit 0
fi

for file in "${files[@]}"; do
  perl -0pi -e "s#(?:ghcr\\.io/(?:<your-org>|your-org)|0x\\.\\.\\.)/verity-backend#$registry/verity-backend#g" "$file"
done

echo "Updated ${#files[@]} manifest(s) to use $registry."
