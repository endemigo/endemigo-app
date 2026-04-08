const fs = require('fs');
const path = require('path');

function getFiles(dir, filesList = []) {
  if (!fs.existsSync(dir)) return filesList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, filesList);
    } else if (fullPath.endsWith('.tsx') && !fullPath.endsWith('.styles.tsx') && !fullPath.endsWith('.styles.ts')) {
      filesList.push(fullPath);
    }
  }
  return filesList;
}

const dirs = [
  '/Users/fatihkartal/Desktop/APPS/endemigo/mobile/app',
  '/Users/fatihkartal/Desktop/APPS/endemigo/mobile/components'
];

let files = [];
dirs.forEach(d => { files = files.concat(getFiles(d)); });

const rule1Violations = [];

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Checking for style={} usage
  const inlineMatch = content.match(/style=\{\{.*?\}\}/g);
  if (inlineMatch && !filePath.includes('collapsible.tsx') && !filePath.includes('hello-wave.tsx') && !filePath.includes('parallax-scroll-view.tsx')) {
      rule1Violations.push(`${filePath.split('mobile/')[1]} - Inline style found`);
  }

  // Checking size threshold 
  const lines = content.split('\n');
  const styleIdx = content.indexOf('StyleSheet.create({');
  
  if (styleIdx !== -1) {
      const startLine = content.slice(0, styleIdx).split('\n').length;
      const stylesCount = lines.length - startLine;
      
      // Is it a Component or Screen? Screens mandate separation regardless of size, Components follow 100/30!
      const isScreen = filePath.includes('mobile/app/');
      
      if (isScreen) {
         rule1Violations.push(`${filePath.split('mobile/')[1]} - STYLESHEET FOUND IN SCREEN!`);
      } else if (lines.length > 100 || stylesCount > 30) {
         rule1Violations.push(`${filePath.split('mobile/')[1]} - COMPONENT SIZE THRESHOLD EXCEEDED (>100 lines or >30 lines styles)`);
      }
  }
});

console.log("=== RULE 1 AUDIT ===");
if (rule1Violations.length === 0) console.log("✅ Passed");
else console.log(rule1Violations.join('\n'));
