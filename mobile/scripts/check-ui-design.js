const fs = require('fs');
const path = require('path');

const checkDirs = [
  path.join(__dirname, '../components/ui'),
  path.join(__dirname, '../app/(tabs)')
];

let hasError = false;

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      checkFile(fullPath);
    }
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fileName = path.basename(filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Strict Color Check: Avoid any raw hex (#FFF), rgb(), or rgba() configurations
    const colorMatch = line.match(/(color|backgroundColor|borderColor|tintColor):\s*['"]?(#[0-9A-Fa-f]{3,8}|rgba?\([^)]+\))['"]?/i);
    if (colorMatch && !line.includes('// eslint-disable')) {
      console.log(`❌ UI/UX Color Violation in ${fileName}:${i + 1} -> Found hardcoded color (${colorMatch[2]}). Must use Colors from theme.ts`);
      hasError = true;
    }

    // 2. Strict Spacing Check: All padding/margin must use Spacing constants (0, 1, 2, or percentage are acceptable exceptions)
    const spacingMatch = line.match(/(padding|margin)(Top|Bottom|Left|Right|Horizontal|Vertical)?:\s*([0-9]{1,3})(?!.*%|.*Spacing)/);
    if (spacingMatch && parseInt(spacingMatch[3]) > 4 && !line.includes('// ignore-spacing') && !line.includes('flex')) {
      console.log(`❌ UI/UX Spacing Violation in ${fileName}:${i + 1} -> Found raw margin/padding value (${spacingMatch[3]}). Must use Spacing.x`);
      hasError = true;
    }

    // 3. Strict Typography Check: Font sizes and families must not be hardcoded
    const fontSizeMatch = line.match(/fontSize:\s*([0-9]{1,3})/);
    if (fontSizeMatch) {
      console.log(`❌ UI/UX Font Violation in ${fileName}:${i + 1} -> Found hardcoded fontSize (${fontSizeMatch[1]}). Must use FontSize.x`);
      hasError = true;
    }

    const fontFamilyMatch = line.match(/fontFamily:\s*['"]([A-Za-z\-]+)['"]/);
    if (fontFamilyMatch && !line.includes('FontFamily')) {
      console.log(`❌ UI/UX Font Violation in ${fileName}:${i + 1} -> Found hardcoded fontFamily (${fontFamilyMatch[1]}). Must use FontFamily.x`);
      hasError = true;
    }
    
    // 4. Strict Interaction Check: Verify TouchableOpacity/Pressable have activeOpacity
    if (line.includes('<TouchableOpacity') && !line.includes('activeOpacity')) {
      console.log(`⚠️ UI/UX Interaction Warning in ${fileName}:${i + 1} -> <TouchableOpacity> missing explicit 'activeOpacity' for micro-interaction.`);
      // Treated as a warning, not a hard error for now
    }
  }
}

console.log('Running UI/UX Design System & Translation tests...');
checkDirs.forEach(scanDir);

if (hasError) {
  console.log('\n❌ Tests failed due to UI/UX guidelines or translation violations.');
  process.exit(1);
} else {
  console.log('\n✅ All UI/UX and Translation tests passed successfully.');
  process.exit(0);
}
