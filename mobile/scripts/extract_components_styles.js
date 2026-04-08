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

  // Extract imports needed for styles
  const importsToCopy = ["import { StyleSheet, Dimensions, Platform } from 'react-native';"];
  const lines = codePart.split('\n');
  lines.forEach(line => {
    if (line.includes("from '../../constants/theme'") || line.includes("from '@/constants/theme'") || line.includes("from '../constants/theme'")) {
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
  const importStatement = `import { styles } from './${parsedPath.name}.styles';\n`;
  
  // Find last import
  const lastImportIdx = newCode.lastIndexOf('import ');
  const nextLineBreak = newCode.indexOf('\n', lastImportIdx);
  
  newCode = newCode.slice(0, nextLineBreak + 1) + importStatement + newCode.slice(nextLineBreak + 1);

  fs.writeFileSync(filePath, newCode + '\n');
  console.log(`Successfully extracted styles from ${parsedPath.base} to ${stylesFileName}`);
}

const filesToProcess = [
  '/Users/fatihkartal/Desktop/APPS/endemigo/mobile/components/ErrorBoundary.tsx',
  '/Users/fatihkartal/Desktop/APPS/endemigo/mobile/components/ui/BannerCarousel.tsx',
  '/Users/fatihkartal/Desktop/APPS/endemigo/mobile/components/ui/BlogCard.tsx',
  '/Users/fatihkartal/Desktop/APPS/endemigo/mobile/components/ui/EditorialBannerRow.tsx',
  '/Users/fatihkartal/Desktop/APPS/endemigo/mobile/components/ui/GlobalModal.tsx',
  '/Users/fatihkartal/Desktop/APPS/endemigo/mobile/components/ui/ProductCard.tsx',
  '/Users/fatihkartal/Desktop/APPS/endemigo/mobile/components/ui/SectionHeader.tsx',
];

filesToProcess.forEach(extractStyles);
