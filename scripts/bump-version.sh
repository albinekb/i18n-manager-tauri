#!/bin/bash
set -eo pipefail
IFS=$'\n\t'

bold=$(tput bold)
normal=$(tput sgr0)

function exists_in_list() {
    LIST=$1
    DELIMITER=$2
    VALUE=$3
    echo $LIST | tr "$DELIMITER" '\n' | grep -F -q -x "$VALUE"
}

if [[ -n $(git status --short) ]]; then
  echo "Git working tree is dirty, exiting.."
  exit 1
fi

if [[ $(git branch --show-current) != "development" ]]; then
  echo "Current branch is not development, switching.."
  git checkout development
fi

allowed_levels='major minor patch'

level=${BASH_ARGV[0]}

if [ "$level" = "auto" ]; then
  echo "Getting bump level.."
  level=$(./scripts/get-bump-level.sh)
  echo "$level"
fi



if ! exists_in_list "$allowed_levels" " " "$level"; then
  if [ "$level" = "none" ]; then
    echo "Usage: bump-version.sh [auto|major|minor|patch]"
    exit 1
  fi
  echo "Invalid version bump: \"${level}\", exiting.."
  exit 1
fi

new_version=$(npm version --no-git-tag-version ${level})
log=$(./scripts/generate-changelog.sh)
message=$(printf "🚢 ${new_version}\n\n${log}")

echo -e "${bold}New version: ${new_version}${normal}\\n\\n${message}"
if [ "$CI" = "true" ]; then
  echo "Running in CI, skipping confirmation.."
  CONT="y"
else
  read -p "Continue (y/n)?" CONT
fi

if [ "$CONT" = "y" ]; then
  git add package.json
  git commit -m "🚢 ${new_version}" -m "${log}"
  git tag -a "${new_version}" -m "${log}"
else
  git checkout package.json
fi