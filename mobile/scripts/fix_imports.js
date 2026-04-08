const fs = require('fs');
const path = require('path');

const dir = '/Users/fatihkartal/Desktop/APPS/endemigo/mobile/app/(tabs)';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.styles.ts'));

files.forEach(f => {
  const fileP = path.join(dir, f);
  let content = fs.readFileSync(fileP, 'utf-8');
  
  if (!content.includes("from 'react-native'")) {
    content = "import { StyleSheet, Dimensions, Platform } from 'react-native';\n" + content;
  }
  
  // Custom fixes for index.styles.ts
  if (f === 'index.styles.ts') {
    content = `const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRODUCT_CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 16) / 2;
const BANNER_WIDTH = SCREEN_WIDTH - 16 * 2;
const SQUARE_CARD = 148;
` + content;
  }
  
  fs.writeFileSync(fileP, content);
});

// Fix Colors.success
['index.tsx', 'categories.tsx'].forEach(f => {
  const fp = path.join(dir, f);
  if (fs.existsSync(fp)) {
    let content = fs.readFileSync(fp, 'utf-8');
    content = content.replace(/Colors\.success/g, 'Colors.auctionGreen');
    fs.writeFileSync(fp, content);
  }
});

console.log("Fixed imports and Colors.success");
