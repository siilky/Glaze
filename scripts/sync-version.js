import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const version = pkg.version;
if (!version) { console.error('No version in package.json'); process.exit(1); }
console.log(`Syncing version: ${version}`);

// Android
const gradlePath = resolve(root, 'android/app/build.gradle');
let gradle = readFileSync(gradlePath, 'utf8');
const gradleBefore = gradle;
gradle = gradle.replace(/versionName\s+["'][^"']*["']/, `versionName "${version}"`);
if (gradle !== gradleBefore) { writeFileSync(gradlePath, gradle, 'utf8'); console.log('  Updated build.gradle'); }
else console.warn('  WARNING: versionName not found in build.gradle');

// iOS
const pbxPath = resolve(root, 'ios/App/App.xcodeproj/project.pbxproj');
let pbx = readFileSync(pbxPath, 'utf8');
const pbxBefore = pbx;
pbx = pbx.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = "${version}";`);
if (pbx !== pbxBefore) { writeFileSync(pbxPath, pbx, 'utf8'); console.log('  Updated project.pbxproj'); }
else console.warn('  WARNING: MARKETING_VERSION not found in project.pbxproj');

console.log('Done.');
