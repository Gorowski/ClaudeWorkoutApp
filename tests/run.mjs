/* Starts the dev server, runs the browser tests against it, shuts it down. */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';

const PORT = Number(process.env.PORT || 8899);
const ROOT = fileURLToPath(new URL('..', import.meta.url));

const server = await serve(PORT);

const child = spawn(process.execPath, ['tests/browser.mjs', ...process.argv.slice(2)], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, BASE_URL: `http://127.0.0.1:${PORT}` },
});

child.on('exit', (code) => { server.close(); process.exit(code ?? 1); });
