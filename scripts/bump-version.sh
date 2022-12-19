#!/bin/bash
set -euo pipefail
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
  exit 0
fi

if [[ $(git branch --show-current) != "development" ]]; then
  echo "Current branch is not development, switching.."
  git checkout development
fi

allowed_levels='major minor patch'

level=${BASH_ARGV[0]}



if ! exists_in_list "$allowed_levels" " " "$level"; then
  echo "Invalid version bump: \"${level}\", exiting.."
  exit 0
fi

new_version=$(npm version --no-git-tag-version ${level})
log=$(git log --graph --pretty=format:'%Cred%h%Creset  %s%Creset' --invert-grep --grep="🚢" --grep="🌹" release..development)
message=$(printf "🚢 ${new_version}\n\n${log}")

echo -e "${bold}New version: ${new_version}${normal}\\n\\n${message}"
read -p "Continue (y/n)?" CONT
if [ "$CONT" = "y" ]; then
  git add package.json
  git commit -m "🚢 ${new_version}" -m "${log}"
else
  git checkout package.json
fi