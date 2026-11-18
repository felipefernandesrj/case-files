#!/usr/bin/env python3
# QA tooling (not product): numbered OLD/NEW pairs from HEAD vs a dry-run file set, each OLD unique, self-checked to rebuild the dry result.
# Usage: gen-pairs.py out.txt path=drycopy [path=drycopy ...]
import sys, subprocess, difflib
out = sys.argv[1]; pairs = []
for arg in sys.argv[2:]:
    path, dry = arg.split('=')
    import os
    head = open(path).read() if os.environ.get('BASE') == 'worktree' else subprocess.run(['git', 'show', 'HEAD:' + path], capture_output=True, text=True).stdout  # BASE=worktree: pairs against the current files
    new = open(dry).read()
    a = head.split('\n'); b = new.split('\n')
    ops = [o for o in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes() if o[0] != 'equal']
    eqmap = {}
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == 'equal':
            for k in range(i2 - i1): eqmap[i1 + k] = j1 + k
    win = []
    for tag, i1, i2, j1, j2 in ops:
        c = 1
        while True:
            s1, e1 = max(0, i1 - c), min(len(a), i2 + c)
            old = '\n'.join(a[s1:e1])
            if head.count(old) == 1 and old.strip() and s1 in eqmap and (e1 - 1) in eqmap: break
            c += 1
        if win and s1 <= win[-1][1]: win[-1][1] = max(win[-1][1], e1)  # merge overlapping windows
        else: win.append([s1, e1])
    merged = [[s1, e1, '\n'.join(a[s1:e1]), '\n'.join(b[(0 if s1 == 0 else eqmap[s1]):(len(b) if e1 == len(a) else eqmap[e1 - 1] + 1)])] for s1, e1 in win]
    cur = head
    for s1, e1, old, neu in merged:
        assert cur.count(old) == 1, (path, old[:80]); cur = cur.replace(old, neu)
        pairs.append((path, old, neu))
    assert cur == new, f'rebuild mismatch {path}'
with open(out, 'w') as f:
    for n, (p, o, nw) in enumerate(pairs, 1):
        f.write(f'Change {n}, file {p}\n[OLD {n}]\n{o}\n[/OLD {n}]\n[NEW {n}]\n{nw}\n[/NEW {n}]\n\n')
print(len(pairs), 'pairs', out)
