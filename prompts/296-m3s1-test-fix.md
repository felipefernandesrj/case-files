Two small fixes. Output ONLY these REPLACE blocks, exactly in this shape (OLD copied exactly, then a line of =====, then NEW):
<<<REPLACE path>>>
OLD
=====
NEW
<<<END>>>

Fix 1, test/generator.mjs check 8: the fake fetch stores only opts, so lastOpts.url is undefined and the check crashes. Store the url too: replace the line
    lastOpts = opts;
with
    lastOpts = { ...opts, url };

Fix 2, src/generator.js line 4 imports loadCase, which the module never uses. Replace
import { fairPlay, timelineCheck, loadCase } from './case.js';
with
import { fairPlay, timelineCheck } from './case.js';
