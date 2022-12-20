
#!/bin/bash
if [[ ! -z ${CI} ]]; then
  set -euo pipefail
fi
IFS=$'\n\t'
export PAGER="cat"

last_tag=$(git tag --sort=creatordate | grep -A 1 ^v | tail -n 1)
log=$(git for-each-ref --format="%(body)" refs/tags/${last_tag} | grep -Ev "^\$")
if [[ -z "${log}" ]]; then
  echo "No log found, exiting.."
  exit 0
fi
subject=$(git for-each-ref --format="%(subject)" refs/tags/${last_tag})
if [[ ! "$subject" == *"🚢"* ]]; then
  echo "No release found, exiting.."
  exit 0
fi
  
echo "${log}"