
#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

if [[ $(git branch --show-current) == "development" ]]; then
  log=$(git log --graph --pretty=format:'%Cred%h%Creset  %s%Creset' --invert-grep --grep="🚢" release..development)
  if [[ -z "$log" ]]; then
    echo "No log found, exiting.."
    exit 1
  fi
  echo "${log}"
else
  log = $(git log -1 --pretty=%B)
  if [[ -z "$log" ]]; then
    echo "No log found, exiting.."
    exit 1
  fi
  if [[ ! "$log" == *"🚢"* ]]; then
    echo "No release found, exiting.."
    exit 1
  fi
   
  echo -e ${log} | tail -n +3 | sed -e '$ d'
fi