const fs = require('fs');
const path = require('path');

const trPath = path.join(__dirname, '../i18n/tr.json');
const enPath = path.join(__dirname, '../i18n/en.json');

const tr = JSON.parse(fs.readFileSync(trPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

function getKeys(obj, prefix = '') {
  let keys = [];
  for (const k in obj) {
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      keys = keys.concat(getKeys(obj[k], prefix + k + '.'));
    } else {
      keys.push(prefix + k);
    }
  }
  return keys;
}

const trKeys = getKeys(tr);
const enKeys = getKeys(en);

const missingInEn = trKeys.filter(k => !enKeys.includes(k));
const missingInTr = enKeys.filter(k => !trKeys.includes(k));

if (missingInEn.length === 0 && missingInTr.length === 0) {
  console.log('✅ TR and EN translation files are perfectly synchronized.');
  process.exit(0);
} else {
  console.log('❌ Missing in EN:', missingInEn);
  console.log('❌ Missing in TR:', missingInTr);
  process.exit(1);
}
