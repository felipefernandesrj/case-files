#!/bin/bash
# waits until 21:06 BRT, then checks every 5 min until all 13 Genuine or 21:40 BRT
cd /workspace/case-files; D=qa/m2gf14-probes/seal
while [ $(date +%H%M) -lt 2106 ]; do sleep 20; done
while :; do
  out=$( (echo "# $(date '+%F %H:%M %z')"; while read g id; do $D/sealcheck.sh $g $id; done < $D/ids.txt) )
  echo "$out" >> $D/attempts.txt
  n=$(echo "$out" | grep -c 'Genuine receipt | Sealed at')
  echo "$(date +%H:%M) genuine=$n/13"
  if [ $n -eq 13 ] || [ $(date +%H%M) -ge 2140 ]; then echo "$out" > $D/all.txt; echo DONE; break; fi
  sleep 300
done
