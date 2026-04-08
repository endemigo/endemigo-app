const fs = require('fs');
const path = require('path');

function getFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, filesList);
    } else if (fullPath.endsWith('.tsx')) {
      filesList.push(fullPath);
    }
  }
  return filesList;
}

const componentsDir = path.join(__dirname, '..', 'components');
const files = getFiles(componentsDir);

const violators = [];
const compliant = [];

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const totalLines = lines.length;

  const styleIdx = content.indexOf('StyleSheet.create({');
  
  // If no stylesheet, or it already uses a separate file, skip counting styles
  if (styleIdx === -1) {
    return;
  }

  // Count styles lines
  const codeBeforeStyles = content.slice(0, styleIdx);
  const stylesStartLine = codeBeforeStyles.split('\n').length;
  // A rough estimate: from StyleSheet.create to end of file, since it's almost always at the bottom
  const stylesLineCount = totalLines - stylesStartLine;

  const isViolator = totalLines > 100 || stylesLineCount > 30;

  const fileRef = filePath.replace(componentsDir + '/', '');

  const data = {
    file: fileRef,
    totalLines,
    stylesLineCount,
    reason: totalLines > 100 ? '> 100 total lines' : '> 30 style lines'
  };

  if (isViolator) {
    violators.push(data);
  } else {
    compliant.push({ file: fileRef, totalLines, stylesLineCount });
  }
});

console.log('--- KURALI İHLAL EDEN BÜYÜK COMPONENTLER (Ayrılması Gerekenler) ---');
console.log(violators.map(v => `❌ ${v.file} | Toplam: ${v.totalLines} satır | Stil Bloğu: ~${v.stylesLineCount} satır | İhlal: ${v.reason}`).join('\n') || 'Hiçbiri!');
console.log('\n--- KURALA UYGUN KALACAK (Ayrılmayacak) KÜÇÜK COMPONENTLER ---');
console.log(compliant.map(c => `✅ ${c.file} | Toplam: ${c.totalLines} satır | Stil Bloğu: ~${c.stylesLineCount} satır`).join('\n') || 'Hiçbiri!');
