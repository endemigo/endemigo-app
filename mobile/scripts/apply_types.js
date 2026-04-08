const fs = require('fs');
const path = require('path');

const mobileDir = '/Users/fatihkartal/Desktop/APPS/endemigo/mobile';

function replaceInFile(relativePath, replacements, importToAdd) {
    const filePath = path.join(mobileDir, relativePath);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    if (importToAdd && !content.includes(importToAdd)) {
        // add import below react/react-native
        const lines = content.split('\n');
        const insertIdx = lines.findIndex(l => l.includes("import {") || l.startsWith("import "));
        lines.splice(insertIdx, 0, importToAdd);
        content = lines.join('\n');
    }

    replacements.forEach(r => {
        content = content.split(r.from).join(r.to);
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content);
    }
}

// 1. HorizontalProductGrid
replaceInFile('components/ui/HorizontalProductGrid.tsx', [
    { from: 'data: Record<string, unknown>[];', to: 'data: Product[];' },
    { from: 'onPress: (item: Record<string, unknown>)', to: 'onPress: (item: Product)' },
    { from: 'import { ProductCard } from', to: 'import ProductCard from' },
], "import { Product } from '@/types';");

// 2. ProductCard
replaceInFile('components/ui/ProductCard.tsx', [
    { from: '[key: string]: unknown;', to: '' },
    { from: 'item: {', to: 'item: Product;' }
], "import { Product } from '@/types';");
// Actually ProductCard used: type Props = { item: Product; onPress: ... } let me regex replace
let pcContent = fs.readFileSync(path.join(mobileDir, 'components/ui/ProductCard.tsx'), 'utf-8');
pcContent = pcContent.replace(/item:\s*\{[\s\S]*?\};/m, 'item: Product;');
if(!pcContent.includes("import { Product }")) {
   pcContent = "import { Product } from '@/types';\n" + pcContent;
}
fs.writeFileSync(path.join(mobileDir, 'components/ui/ProductCard.tsx'), pcContent);

// 3. BlogCard
let bcContent = fs.readFileSync(path.join(mobileDir, 'components/ui/BlogCard.tsx'), 'utf-8');
bcContent = bcContent.replace(/item:\s*\{[\s\S]*?\};/m, 'item: Blog;');
if(!bcContent.includes("import { Blog }")) {
   bcContent = "import { Blog } from '@/types';\n" + bcContent;
}
fs.writeFileSync(path.join(mobileDir, 'components/ui/BlogCard.tsx'), bcContent);

// 4. api.ts
replaceInFile('lib/api.ts', [], ''); 
// We just need to fix that token resolve issues but that's string, done in fix_violations.js. But TS failed on resolve(token).
let apiContent = fs.readFileSync(path.join(mobileDir, 'lib/api.ts'), 'utf-8');
apiContent = apiContent.replace(/resolve:\s*\(value:\s*string\)/g, 'resolve: (value: string | null)');
fs.writeFileSync(path.join(mobileDir, 'lib/api.ts'), apiContent);

// 5. storage.ts
replaceInFile('store/authStore.ts', [
    { from: 'user: Record<string, unknown> | null', to: 'user: User | null' }
], "import { User } from '@/types';");

replaceInFile('lib/storage.ts', [
    { from: 'user: Record<string, unknown> | null', to: 'user: User | null' }
], "import { User } from '@/types';");

// 6. index.tsx
replaceInFile('app/(tabs)/index.tsx', [
    { from: 'items.map((item: Record<string, unknown>)', to: 'items.map((item: Product)' },
    { from: '(p: Record<string, unknown>)', to: '(p: Product)' },
    { from: 'catProducts.map((item: Record<string, unknown>)', to: 'catProducts.map((item: Product)' },
    { from: 'blogs.map((blog: Record<string, unknown>)', to: 'blogs.map((blog: Blog)' }
], "import { Product, Blog, Category } from '@/types';");

// 7. auction/[id].tsx
replaceInFile('app/auction/[id].tsx', [
    { from: 'bids.map((bid: Record<string, unknown>, idx: number)', to: 'bids.map((bid: Bid, idx: number)' }
], "import { Bid } from '@/types';");

console.log('Applied strict interfaces.');
