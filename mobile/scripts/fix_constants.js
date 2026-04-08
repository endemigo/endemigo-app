const fs = require('fs');
const path = require('path');

const bDir = '/Users/fatihkartal/Desktop/APPS/endemigo/mobile/components/ui';

function prepend(f, str) {
  const fp = path.join(bDir, f);
  if (fs.existsSync(fp)) {
    let content = fs.readFileSync(fp, 'utf-8');
    content = str + '\n' + content;
    fs.writeFileSync(fp, content);
  }
}

prepend('BannerCarousel.styles.ts', "const { width: SCREEN_WIDTH } = Dimensions.get('window');\nconst CARD_WIDTH = SCREEN_WIDTH * 0.85;");
prepend('BlogCard.styles.ts', "const { width: SCREEN_WIDTH } = Dimensions.get('window');\nconst CARD_WIDTH = SCREEN_WIDTH * 0.75;");
prepend('EditorialBannerRow.styles.ts', "const { width: SCREEN_WIDTH } = Dimensions.get('window');\nconst CARD_WIDTH = SCREEN_WIDTH * 0.8;");
prepend('GlobalModal.styles.ts', "const { width: SCREEN_WIDTH } = Dimensions.get('window');");
prepend('ProductCard.styles.ts', "const { width: SCREEN_WIDTH } = Dimensions.get('window');\nconst SQUARE_SIZE = (SCREEN_WIDTH - 16 * 3) / 2;");

// Fix [id].tsx duplicate styles issue caused by sed
const idTsx = '/Users/fatihkartal/Desktop/APPS/endemigo/mobile/app/auction/[id].tsx';
let idContent = fs.readFileSync(idTsx, 'utf-8');
// remove the first const styles = StyleSheet.create({ spacer: { height: 40 } });
idContent = idContent.replace("const styles = StyleSheet.create({ spacer: { height: 40 } });\n", "");
fs.writeFileSync(idTsx, idContent);
console.log('Fixed constants and duplicate styles');
