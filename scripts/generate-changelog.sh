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