import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');
const envPath = path.join(backendDir, '.env');

// Parse args: --anm=+91... --phc=+91...
const args = process.argv.slice(2);
let anmPhone = '';
let phcPhone = '';

args.forEach((arg) => {
  if (arg.startsWith('--anm=')) anmPhone = arg.replace('--anm=', '').trim();
  if (arg.startsWith('--phc=')) phcPhone = arg.replace('--phc=', '').trim();
});

if (!anmPhone && !phcPhone) {
  console.log('Usage: node scripts/set-test-numbers.mjs --anm=+9198XXXXXXXX --phc=+9197YYYYYYYY');
  console.log('\nExample:');
  console.log('  node scripts/set-test-numbers.mjs --anm=+919876543210 --phc=+919876543211\n');
  process.exit(1);
}

// 1. Update .env
if (fs.existsSync(envPath)) {
  let content = fs.readFileSync(envPath, 'utf-8');
  if (anmPhone) {
    if (content.includes('TEST_ANM_PHONE=')) {
      content = content.replace(/TEST_ANM_PHONE=.*(\r?\n|$)/, `TEST_ANM_PHONE=${anmPhone}\n`);
    } else {
      content += `\nTEST_ANM_PHONE=${anmPhone}`;
    }
  }
  if (phcPhone) {
    if (content.includes('TEST_PHC_PHONE=')) {
      content = content.replace(/TEST_PHC_PHONE=.*(\r?\n|$)/, `TEST_PHC_PHONE=${phcPhone}\n`);
    } else {
      content += `\nTEST_PHC_PHONE=${phcPhone}`;
    }
  }
  fs.writeFileSync(envPath, content, 'utf-8');
  console.log('✅ Updated backend/.env successfully');
}

// 2. Update SQLite database directly if available
try {
  const { db, initDatabase } = await import('../dist/db/index.js');
  initDatabase();
  if (anmPhone) {
    db.prepare(`UPDATE users SET phone = ? WHERE id = 'USR-ANM-01'`).run(anmPhone);
    console.log(`✅ Database: USR-ANM-01 (ANM Rekha) linked to ${anmPhone}`);
  }
  if (phcPhone) {
    db.prepare(`UPDATE users SET phone = ? WHERE id = 'USR-PHC-SN'`).run(phcPhone);
    console.log(`✅ Database: USR-PHC-SN (PHC Staff Nurse Suman) linked to ${phcPhone}`);
  }
} catch (err) {
  console.warn('Note: Run "npm run build" in backend if dist is not compiled yet.');
}

console.log('\n🎉 Test phone numbers configured! Next Steps backend will recognize incoming messages from these numbers.');
