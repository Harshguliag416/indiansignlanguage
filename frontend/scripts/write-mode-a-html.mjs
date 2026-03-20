import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const sourcePath = path.join(root, 'webModeAHtml.js');
const outputPath = path.join(root, 'dist', 'mode-a-web.html');

const source = fs.readFileSync(sourcePath, 'utf8');
const match = source.match(/String\.raw`([\s\S]*)`;\s*$/);

if (!match) {
  throw new Error('Failed to extract WEB_MODE_A_HTML from webModeAHtml.js');
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, match[1], 'utf8');

console.log(`Wrote ${outputPath}`);
