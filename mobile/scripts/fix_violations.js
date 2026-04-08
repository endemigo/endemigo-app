const fs = require('fs');
const path = require('path');

const mobileDir = '/Users/fatihkartal/Desktop/APPS/endemigo/mobile';

function replaceInFile(relativePath, replacements) {
    const filePath = path.join(mobileDir, relativePath);
    if (!fs.existsSync(filePath)) {
        console.log("File not found:", filePath);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;
    
    replacements.forEach(r => {
        content = content.split(r.from).join(r.to);
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${relativePath}`);
    }
}

// 1. Fixing 'any' types
replaceInFile('lib/storage.ts', [
    { from: 'async setUser(user: any)', to: 'async setUser(user: Record<string, unknown> | null)' }
]);

replaceInFile('lib/api.ts', [
    { from: 'resolve: (value: any)', to: 'resolve: (value: string)' },
    { from: 'reject: (error: any)', to: 'reject: (error: Error | unknown)' },
    { from: 'const processQueue = (error: any,', to: 'const processQueue = (error: Error | unknown | null,' }
]);

replaceInFile('components/ui/BlogCard.tsx', [
    { from: 'item: any;', to: 'item: { id: string | number; title: string; image: any; readTime: string; date: string; [key: string]: unknown };' } // Using temporary inline type instead of any, 'image: any' is required natively sometimes or image props
]);

replaceInFile('components/ui/ProductCard.tsx', [
    { from: '[key: string]: any;', to: '[key: string]: unknown;' }
]);

replaceInFile('components/ui/HorizontalProductGrid.tsx', [
    { from: 'data: any[];', to: 'data: Record<string, unknown>[];' },
    { from: 'onPress: (item: any)', to: 'onPress: (item: Record<string, unknown>)' }
]);

const authFiles = ['app/(auth)/register.tsx', 'app/(auth)/login.tsx', 'app/auction/[id].tsx', 'app/(tabs)/profile.tsx'];
authFiles.forEach(f => {
    replaceInFile(f, [
        { from: '} catch (err: any) {', to: '} catch (err: unknown) {' }
    ]);
});

replaceInFile('app/(tabs)/index.tsx', [
    { from: 'items.map((item: any)', to: 'items.map((item: Record<string, unknown>)' },
    { from: '(p: any) => p.categoryId === cat.id || p.categoryName === cat.name', to: '(p: Record<string, unknown>) => p.categoryId === cat.id || p.categoryName === cat.name' },
    { from: 'catProducts.map((item: any)', to: 'catProducts.map((item: Record<string, unknown>)' },
    { from: 'blogs.map((blog: any)', to: 'blogs.map((blog: Record<string, unknown>)' }
]);

replaceInFile('app/auction/[id].tsx', [
    { from: 'bids.map((bid: any, idx: number)', to: 'bids.map((bid: Record<string, unknown>, idx: number)' }
]);

// 2. Fixing i18n
replaceInFile('app/product/[id].tsx', [
    { from: "import { useLocalSearchParams, useRouter } from 'expo-router';", to: "import { useLocalSearchParams, useRouter } from 'expo-router';\nimport { useTranslation } from 'react-i18next';" },
    { from: "const router = useRouter();", to: "const router = useRouter();\n  const { t } = useTranslation();" },
    { from: ">Ürün bulunamadı</Text>", to: ">{t('product.notFound')}</Text>" },
    { from: ">Satıcı</Text>", to: ">{t('product.seller')}</Text>" },
    { from: ">Ürün Açıklaması</Text>", to: ">{t('product.descriptionTitle')}</Text>" },
    { from: ">Orijinal</Text>", to: ">{t('product.trust_original')}</Text>" },
    { from: ">Hızlı Kargo</Text>", to: ">{t('product.trust_shipping')}</Text>" },
    { from: ">İade Garantisi</Text>", to: ">{t('product.trust_return')}</Text>" },
    { from: ">Fiyat</Text>", to: ">{t('product.priceLabel')}</Text>" },
    { from: ">Hemen Al</Text>", to: ">{t('product.buyNow')}</Text>" }
]);

replaceInFile('app/auction/[id]/result.tsx', [
    { from: "import { useLocalSearchParams, useRouter } from 'expo-router';", to: "import { useLocalSearchParams, useRouter } from 'expo-router';\nimport { useTranslation } from 'react-i18next';" },
    { from: "const router = useRouter();", to: "const router = useRouter();\n  const { t } = useTranslation();" },
    { from: ">Geri</Text>", to: ">{t('common.back')}</Text>" },
    { from: ">Final Fiyat</Text>", to: ">{t('auction.finalPrice')}</Text>" },
    { from: ">Alıcı Primi</Text>", to: ">{t('auction.buyerPremium')}</Text>" },
    { from: ">Toplam</Text>", to: ">{t('auction.totalLabel')}</Text>" },
    { from: ">Toplam Teklif</Text>", to: ">{t('auction.totalBids')}</Text>" },
    { from: ">Kazanan</Text>", to: ">{t('auction.winner')}</Text>" },
    { from: ">Müzayedelere Dön</Text>", to: ">{t('auction.backToAuctions')}</Text>" }
]);

replaceInFile('app/auction/[id].tsx', [
    { from: "import { useLocalSearchParams, useRouter } from 'expo-router';", to: "import { useLocalSearchParams, useRouter } from 'expo-router';\nimport { useTranslation } from 'react-i18next';" },
    { from: "const router = useRouter();", to: "const router = useRouter();\n  const { t } = useTranslation();" },
    { from: ">CANLI</Text>", to: ">{t('auction.live')}</Text>" },
    { from: ">Güncel Fiyat</Text>", to: ">{t('auction.currentPrice')}</Text>" },
    { from: ">Teklif Ver</Text>", to: ">{t('auction.placeBid')}</Text>" },
    { from: "Min: ₺{minBid.toLocaleString('tr-TR')}", to: "{t('auction.minBid', { amount: minBid.toLocaleString('tr-TR') })}" },
    { from: ">TEKLİF</Text>", to: ">{t('auction.bidButton')}</Text>" },
    { from: ">Sonucu Gör</Text>", to: ">{t('auction.seeResult')}</Text>" },
    { from: ">Bu sizin müzayedeniz</Text>", to: ">{t('auction.yourAuction')}</Text>" },
    { from: ">Son Teklifler</Text>", to: ">{t('auction.lastBidsTitle')}</Text>" },
    { from: ">Henüz teklif yok</Text>", to: ">{t('auction.noBidsYet')}</Text>" }
]);

replaceInFile('app/(auth)/register.tsx', [
    { from: ">Kayıt Ol</Text>", to: ">{t('auth.registerButton')}</Text>" },
    { from: "Zaten hesabın var mı? <Text", to: "{t('auth.alreadyHaveAccount')} <Text" },
    { from: ">Giriş Yap</Text>", to: ">{t('auth.loginLink')}</Text>" }
]);

// 3. Update tr.json
const trPath = path.join(mobileDir, 'i18n', 'tr.json');
if (fs.existsSync(trPath)) {
    let trData = JSON.parse(fs.readFileSync(trPath, 'utf-8'));
    
    // Add missing product keys
    trData.product = {
        ...(trData.product || {}),
        notFound: "Ürün bulunamadı",
        seller: "Satıcı",
        descriptionTitle: "Ürün Açıklaması",
        trust_original: "Orijinal",
        trust_shipping: "Hızlı Kargo",
        trust_return: "İade Garantisi",
        priceLabel: "Fiyat",
        buyNow: "Hemen Al"
    };

    // Add missing auction keys
    trData.auction = {
        ...(trData.auction || {}),
        finalPrice: "Final Fiyat",
        buyerPremium: "Alıcı Primi",
        totalLabel: "Toplam",
        totalBids: "Toplam Teklif",
        winner: "Kazanan",
        backToAuctions: "Müzayedelere Dön",
        live: "CANLI",
        currentPrice: "Güncel Fiyat",
        placeBid: "Teklif Ver",
        minBid: "Min: ₺{{amount}}",
        bidButton: "TEKLİF",
        seeResult: "Sonucu Gör",
        yourAuction: "Bu sizin müzayedeniz",
        lastBidsTitle: "Son Teklifler",
        noBidsYet: "Henüz teklif yok"
    };

    trData.auth = {
        ...(trData.auth || {}),
        registerButton: "Kayıt Ol",
        alreadyHaveAccount: "Zaten hesabın var mı?",
        loginLink: "Giriş Yap"
    };

    trData.common = {
        ...(trData.common || {}),
        back: "Geri"
    };

    fs.writeFileSync(trPath, JSON.stringify(trData, null, 2));
    console.log("Updated tr.json");
} else {
    console.log("tr.json not found!");
}
