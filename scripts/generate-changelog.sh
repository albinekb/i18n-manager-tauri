#!/bin/bash
if [[ ! -z ${CI} ]]; then
  set -euo pipefail
fi
IFS=$'\n\t'
export PAGER="cat"

last_tag=$(git tag --sort=creatordate | grep -A 1 ^v | tail -n 1)
log=$(\
  git log --no-merges --pretty=format:'%Cred%h%Creset  %s%Creset'\
  --invert-grep --grep="🚢" --grep="🌹"\
  refs/tags/${last_tag}..HEAD\
)

if [[ -z "${log}" ]]; then
  echo "No log found, exiting.."
  exit 1
fi

echo "${log}"