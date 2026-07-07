// Combine the two built PWAs into one Firebase Hosting directory:
//   hosting/            <- Admin app (served at /)
//   hosting/doctor/     <- Doctor app (served at /doctor/)
import { rmSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const p = (rel) => root + rel;

for (const dist of ['apps/admin/dist', 'apps/doctor/dist']) {
  if (!existsSync(p(dist))) {
    console.error(`Missing ${dist}. Run the app builds first.`);
    process.exit(1);
  }
}

rmSync(p('hosting'), { recursive: true, force: true });
mkdirSync(p('hosting'), { recursive: true });
cpSync(p('apps/admin/dist'), p('hosting'), { recursive: true });
cpSync(p('apps/doctor/dist'), p('hosting/doctor'), { recursive: true });
console.log('Assembled hosting/  (admin at /, doctor at /doctor/)');
