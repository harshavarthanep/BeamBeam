// Run after "npx cap add android" (the GitHub workflow does this for you).
// Gives the Android app: camera for QR scanning, keep-awake during transfers,
// saving to Documents/Beam Beam, larger memory, and a version from the release tag.
import fs from 'node:fs';
const man = 'android/app/src/main/AndroidManifest.xml';
let m = fs.readFileSync(man, 'utf8');
const perms = [
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-permission android:name="android.permission.WAKE_LOCK" />',
  '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
  '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />',
  '<uses-feature android:name="android.hardware.camera" android:required="false" />'
];
for (const p of perms) { const key = p.match(/name="([^"]+)"/)[1]; if (!m.includes(key)) m = m.replace('<application', p + '\n    <application'); }
if (!m.includes('android:largeHeap')) m = m.replace('<application', '<application android:largeHeap="true" android:requestLegacyExternalStorage="true"');
fs.writeFileSync(man, m);
const gradle = 'android/app/build.gradle';
let g = fs.readFileSync(gradle, 'utf8');
const ver = (process.env.APP_VERSION || '1.0.0').replace(/^v/, '');
const [a, b, c] = ver.split('.').map(n => parseInt(n, 10) || 0);
g = g.replace(/versionCode \d+/, 'versionCode ' + (a * 10000 + b * 100 + c)).replace(/versionName "[^"]*"/, 'versionName "' + ver + '"');
fs.writeFileSync(gradle, g);
console.log('Android project ready — version ' + ver);
