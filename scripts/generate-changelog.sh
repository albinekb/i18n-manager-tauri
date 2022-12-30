#!/bin/bash
set -euo pipefail
IFS=$'\n\t'
PAGER="cat"
last_tag=$(git tag --sort=creatordate | grep -A 1 ^v | tail -n 1)



log=$(\
  git log --no-merges --pretty=format:'%Cred%h%Creset  %s%Creset'\
  --invert-grep --grep="🚢" --grep="🌹"\
  refs/tags/${last_tag}..HEAD\
)

if [ ! -z "${BASH_ARGV+x}" ]; then
  if [[ "${BASH_ARGV[0]}" == "--skip-check" ]]; then
    echo "${log}"
    exit 0
  fi
fi

command="require('./package.json').version === \"${last_tag}\".replace('v','')"
package_version_released=$(node -p $command)

if [[ "${package_version_released}" == "true" ]]; then
  echo -e "$log\n"
  echo "Version ${last_tag} already released, exiting.."
  exit 1
fi

if [[ -z "${log}" ]]; then
  echo "No log found, exiting.."
  exit 1
fi

echo "${log}"