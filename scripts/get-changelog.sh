
#!/bin/bash
if [[ ! -z ${CI} ]]; then
  set -euo pipefail
fi
IFS=$'\n\t'
export PAGER="cat"
if [[ $(git branch --show-current) == "development" ]]; then
  log=$(git log --graph --pretty=format:'%Cred%h%Creset  %s%Creset' --invert-grep --grep="🚢" release..development)
  if [[ -z ${log} ]]; then
    echo "No log found, exiting.."
    exit 0
  fi
  echo "${log}"
else
  log=$(git log -1 --pretty=%B)
  if [[ -z "${log}" ]]; then
    echo "No log found, exiting.."
    exit 0
  fi
  if [[ ! "$log" == *"🚢"* ]]; then
    echo "No release found, exiting.."
    exit 0
  fi
   
  echo -e "${log}" | tail -n +2 | grep -Ev "^\$"
fi