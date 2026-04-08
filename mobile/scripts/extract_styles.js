const fs = require('fs');
const path = require('path');

function extractStyles(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const styleMatch = content.indexOf('const styles = StyleSheet.create({');
  
  if (styleMatch === -1) {
    console.log(`No StyleSheet found in ${filePath}`);
    return;
  }

  const codePart = content.slice(0, styleMatch);
  const stylePart = content.slice(styleMatch);

  // Extract imports needed for styles (Theme, react-native)
  const importsToCopy = [];
  const lines = codePart.split('\n');
  lines.forEach(line => {
    if (line.includes("from 'react-native'") && line.includes("StyleSheet")) {
      importsToCopy.push("import { StyleSheet, Dimensions } from 'react-native';");
    }
    if (line.includes("from '../../constants/theme'") || line.includes("from '@/constants/theme'")) {
      importsToCopy.push(line);
    }
  });

  const parsedPath = path.parse(filePath);
  const stylesFileName = `${parsedPath.name}.styles.ts`;
  const stylesFilePath = path.join(parsedPath.dir, stylesFileName);

  const styleContent = `${importsToCopy.join('\n')}\n\nexport ${stylePart}`;

  fs.writeFileSync(stylesFilePath, styleContent);

  // Modify original file: add import, remove styles
  let newCode = codePart.trim();
  // Remove unused StyleSheet import? No, let's keep it safe. 
  // Add import { styles } from './name.styles';
  const importStatement = `import { styles } from './${parsedPath.name}.styles';\n`;
  
  // Find last import
  const lastImportIdx = newCode.lastIndexOf('import ');
  const nextLineBreak = newCode.indexOf('\n', lastImportIdx);
  
  newCode = newCode.slice(0, nextLineBreak + 1) + importStatement + newCode.slice(nextLineBreak + 1);

  fs.writeFileSync(filePath, newCode + '\n');
  console.log(`Successfully extracted styles from ${filePath} to ${stylesFileName}`);
}

const filesToProcess = [
  '/Users/fatihkartal/Desktop/APPS/endemigo/mobile/app/(tabs)/index.tsx',
  '/Users/fatihkartal/Desktop/APPS/endemigo/mobile/app/(tabs)/profile.tsx',
  '/Users/fatihkartal/Desktop/APPS/endemigo/mobile/app/(tabs)/auctions.tsx',
  '/Users/fatihkartal/Desktop/APPS/endemigo/mobile/app/(tabs)/categories.tsx',
  '/Users/fatihkartal/Desktop/APPS/endemigo/mobile/app/(tabs)/explore.tsx',
  '/Users/fatihkartal/Desktop/APPS/endemigo/mobile/app/(tabs)/cart.tsx',
];

filesToProcess.forEach(extractStyles);
