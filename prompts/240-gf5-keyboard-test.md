Patch test/keyboard.mjs only. Output exactly one REPLACE block, then stop. The block is: a marker line `<<<REPLACE test/keyboard.mjs>>>`, then the old text copied exactly (character for character, with NO < characters added in front of it), then a line of exactly five equals signs, then the new text, then a line `<<<END>>>`. Only the marker lines start with <<<. NEVER emit <<<FILE>>>. No commentary, no markdown fences. The new text is given in full between the lines BEGIN and FINISH: copy it exactly and do not output the words BEGIN or FINISH.

Context: a headless Chrome keyboard test of a detective game. This step accuses the first suspect, which is a wrong verdict. A wrong verdict now opens a CONTINUE countdown that takes the focus (button #continue-yes); Escape gives up (GAME OVER, focus on #continue-close, culprit and solution shown in #verdict) and a second Escape closes the box (focus on #restart-btn). Update the step so it walks this flow with the keyboard. The helper pressKey(key, code, vk, text) already exists.

Old text (exact, three lines):
  await waitFor(async () => !(await evaluate(`document.getElementById('credits').hidden`)));
  const focus = await evaluate(`document.activeElement.id`);
  if (focus !== 'credits') throw new Error(`expected credits focus, got ${focus}`);
New text:
BEGIN
  await waitFor(async () => !(await evaluate(`document.getElementById('credits').hidden`)));
  const focus = await evaluate(`document.activeElement.id`);
  if (focus !== 'continue-yes') throw new Error(`expected continue-yes focus after a wrong verdict, got ${focus}`);
  const hidden = await evaluate(`document.getElementById('verdict').innerText`);
  if (hidden.includes('Culprit')) throw new Error(`culprit shown while the countdown runs: ${hidden}`);
  await pressKey('Escape', 'Escape', 27);
  await waitFor(async () => (await evaluate(`document.activeElement.id`)) === 'continue-close');
  const over = await evaluate(`document.getElementById('continue-title').textContent`);
  if (over !== 'GAME OVER') throw new Error(`expected GAME OVER, got ${over}`);
  const shown = await evaluate(`document.getElementById('verdict').innerText`);
  if (!shown.includes('Culprit')) throw new Error(`culprit not shown at game over: ${shown}`);
  await pressKey('Escape', 'Escape', 27);
  await waitFor(async () => (await evaluate(`document.activeElement.id`)) === 'restart-btn');
  if (!(await evaluate(`document.getElementById('continue').hidden`))) throw new Error('continue box still visible after the second Escape');
FINISH
