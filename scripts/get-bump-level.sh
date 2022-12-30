#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

bold=$(tput bold)
normal=$(tput sgr0)

log=$(./scripts/generate-changelog.sh --skip-check)

if [[ -z "${log}" ]]; then
  echo "No log found, exiting.."
  exit 1
fi

if [[ "$log" == *"💥"* ]]; then
  echo "major"
  exit 0
fi

if [[ "$log" == *"🎉"* ]]; then
  echo "minor"
  exit 0
fi


echo "patch"
exit 0