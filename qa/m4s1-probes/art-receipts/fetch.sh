#!/bin/bash
# QA tooling: exact cost of each art receipt from its public receipt page (no key, no paid call)
while IFS=$'\t' read -r id att r; do
  f=/tmp/art-$r.html; code=$(curl -s -m 20 -o $f -w '%{http_code}' "https://qa.fullcup.ai/receipts/$r")
  t=$(perl -0pe 's/<style.*?<\/style>//gs; s/<script.*?<\/script>//gs; s/<[^>]*>/ /g; s/\s+/ /g' $f)
  v=$(echo "$t" | grep -o -E '(Genuine receipt|Not genuine[a-z ]*|Recorded, waiting for the daily seal|Could not check)' | head -1)
  c=$(echo "$t" | grep -o -E 'Exact cost \$[0-9.]+' | head -1 | sed 's/Exact cost \$//')
  at=$(echo "$t" | grep -o -E 'Sealed at [0-9-]+ [0-9:]+ UTC' | head -1)
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$id" "$att" "$r" "$code" "${v:-none}" "${c:-}" "${at:-}"
done
