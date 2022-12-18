#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

bold=$(tput bold)
normal=$(tput sgr0)

if [[ -n $(git status --short) ]]; then
  echo "Git working tree is dirty, exiting.."
  exit 0
fi

if [[ $(git branch --show-current) != "development" ]]; then
  echo "Current branch is not development, switching.."
  git checkout development
fi
CURRENT_VERSION=$(cat package.json | jq -r '.version')

echo "Fetching latest changes.."
git checkout release
git pull origin release

echo "Checking version..."
RELEASED_VERSION=$(git show release:package.json | jq -r '.version')


echo "${bold}release version${normal}: $RELEASED_VERSION
${bold}development version${normal}: $CURRENT_VERSION"

if [[ $RELEASED_VERSION == $CURRENT_VERSION ]]; then
  echo "Current version is already released, exiting.."
  git checkout development
  exit 0
fi

echo "${bold}Merging development into release..${normal}"
git merge development
git push origin release
git checkout development