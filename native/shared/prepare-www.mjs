// Builds the app folder (www/) for the Windows / Mac / Linux / Android apps from
// the website files in the repository root, and adds native-bridge.js.
// Run from native/desktop or native/mobile:   node ../shared/prepare-www.mjs www
// Your website files are never changed — only the copy inside www/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const dest = path.resolve(process.cwd(), process.argv[2] || 'www');
const src = path.join(root, 'index.html');
if (!fs.existsSync(src)) { console.error('Cannot find index.html in the repository root.'); process.exit(1); }

let version = process.env.APP_VERSION || '';
if (!version) { try { version = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')).version; } catch (_) {} }
const repo = process.env.GITHUB_REPOSITORY || process.env.BEAM_REPO || 'harshavarthanep/BeamBeam';

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
for (const item of ['lib', 'fonts', 'favicon.svg', 'manifest.webmanifest', 'beambeam-icon-192.png', 'beambeam-icon-512.png', 'beambeam-apple-touch-icon.png']) {
  const from = path.join(root, item);
  if (fs.existsSync(from)) fs.cpSync(from, path.join(dest, item), { recursive: true });
}
let html = fs.readFileSync(src, 'utf8');
const bridge = fs.readFileSync(path.join(here, 'native-bridge.js'), 'utf8')
  .replace('__BB_VERSION__', JSON.stringify(version || '1.0.0')).replace('__BB_REPO__', JSON.stringify(repo));
const anchor = '<script src="lib/mqtt.min.js"></script>';
if (!html.includes(anchor)) { console.error('index.html no longer loads lib/mqtt.min.js — cannot place the native bridge.'); process.exit(1); }
html = html.replace(anchor, '<script>\n' + bridge + '\n</script>\n' + anchor);
fs.writeFileSync(path.join(dest, 'index.html'), html);
console.log('www/ ready — Beam Beam ' + (version || '1.0.0') + ' (' + repo + ')');
