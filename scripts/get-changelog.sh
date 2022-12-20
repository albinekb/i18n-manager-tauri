
#!/bin/bash
if [[ ! -z ${CI} ]]; then
  set -euo pipefail
fi
IFS=$'\n\t'
export PAGER="cat"

last_tag=$(git tag --sort=creatordate | grep -A 1 ^v | tail -n 1)
log=$(git tag -l --format="%(contents)" ${last_tag} | grep -Ev "^\$")
if [[ -z "${log}" ]]; then
  echo "No log found, exiting.."
  exit 0
fi

echo "${log}"