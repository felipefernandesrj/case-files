#!/bin/bash
# usage: sealcheck.sh <group> <id>   writes qa/m2gf12-probes/seal/seal-<id>.snip.txt and prints a line
g=$1; id=$2; f=/tmp/seal-$id.html
code=$(curl -s -o $f -w '%{http_code}' "https://qa.fullcup.ai/receipts/$id")
t=$(perl -0pe 's/<style.*?<\/style>//gs; s/<script.*?<\/script>//gs; s/<[^>]*>/ /g; s/\s+/ /g' $f)
v=$(echo "$t" | grep -o -E '(Genuine receipt|Not genuine[a-z ]*|Recorded, waiting for the daily seal|Could not check)' | head -1)
s=$(echo "$t" | grep -o -E 'Sealed at [0-9-]+ [0-9:]+ UTC' | head -1)
w=$(echo "$t" | grep -o -E 'waiting for the daily seal' | head -1)
c=$(echo "$t" | grep -o -E 'Exact cost \$[0-9.]+' | head -1)
r=$(echo "$t" | grep -o -E 'one of [0-9]+ in the signed root of [0-9-]+' | head -1)
m=$(echo "$t" | grep -o -E 'Model @cf/[a-z0-9./-]+' | head -1 | sed 's#Model @cf/[a-z0-9-]*/##')
line="HTTP $code | ${v:-no verdict} | ${s:-${w:-no seal}} | ${c:-no cost} | ${r:-no root} | ${m:-no model}"
echo "$line" > qa/m2gf12-probes/seal/seal-$id.snip.txt
echo "$g $id $line"
