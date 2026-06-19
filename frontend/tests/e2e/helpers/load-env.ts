import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const frontendRoot = resolve(__dirname, '../../..');

for (const file of ['.env', '.env.local'] as const) {
  const envPath = resolve(frontendRoot, file);
  if (existsSync(envPath)) {
    config({ path: envPath, override: file === '.env.local' });
  }
}
