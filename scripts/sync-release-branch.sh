#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

if [[ -n $(git status --short) ]]; then
  echo "Git working tree is dirty, exiting.."
  exit 0
fi

if [[ $(git branch --show-current) != "development" ]]; then
  echo "Current branch is not development, switching.."
  git checkout development
fi

echo "Syncing release branch with development.."
git pull origin development
git checkout release
git merge development
git push origin release
git checkout development