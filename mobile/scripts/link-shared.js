// @endemigo/shared'i node_modules altına symlink olarak bağlar.
// package.json'da `file:../shared-types` bağımlılığı EAS'ta `npm ci`'yi
// bozduğu için (kök package.json yok), symlink'i postinstall'da elle kurarız.
// Böylece hem yerel hem EAS build'de node_modules/@endemigo/shared mevcut olur
// ve Metro paketi normal şekilde çözer.
const fs = require('fs');
const path = require('path');

const scope = path.join(__dirname, '..', 'node_modules', '@endemigo');
const linkPath = path.join(scope, 'shared');
// node_modules/@endemigo/shared -> ../../../shared-types
const target = path.join('..', '..', '..', 'shared-types');
const resolved = path.resolve(scope, target);

try {
  if (!fs.existsSync(resolved)) {
    console.warn(`[link-shared] hedef bulunamadı, atlanıyor: ${resolved}`);
    process.exit(0);
  }
  fs.mkdirSync(scope, { recursive: true });
  // Var olan (bozuk olabilecek) link/dizini temizle.
  try {
    fs.rmSync(linkPath, { recursive: true, force: true });
  } catch {}
  fs.symlinkSync(target, linkPath, 'dir');
  console.log('[link-shared] node_modules/@endemigo/shared symlink kuruldu');
} catch (err) {
  console.warn(`[link-shared] symlink kurulamadı: ${err.message}`);
  process.exit(0);
}
