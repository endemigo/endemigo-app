import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EntityManager } from 'typeorm';

/**
 * Demo/test verisindeki görsel-başlık uyumsuzluklarını düzeltir.
 *
 * Kapsam:
 *  1. Eski seed scriptlerinden kalan ürünler (Ask Price Seed, [SEED], lot ürünleri)
 *     — başlığa uygun, tek tek doğrulanmış Wikimedia Commons görselleri atanır.
 *  2. Banner slaytları — slide title.tr eşleşmesine göre görsel düzeltilir.
 *  3. Çöp adlı (test/tes/rtet, Phase11, simülasyon) veya görselsiz ürünler
 *     — sıradaki hazır ürün kimliğini (ad + açıklama + görsel) alır.
 *
 * Idempotent: tekrar çalıştırmak güvenlidir. Yalnızca dev/test verisi için tasarlandı.
 *
 * Çalıştırma: npx ts-node -r tsconfig-paths/register src/scripts/fix-demo-images.ts
 */

type ProductFix = {
  /** Tam başlık ya da LIKE deseni (% içeriyorsa LIKE ile eşleşir) */
  title: string;
  imageUrl: string;
  newTitle?: string;
  description?: string;
};

const PRODUCT_FIXES: ProductFix[] = [
  // --- Ask Price Seed ürünleri ---
  {
    title: 'Ask Price Seed - Akilli Telefon',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Blackview_A60_Smartphone_Android_mobile_phone_back_face.jpg/960px-Blackview_A60_Smartphone_Android_mobile_phone_back_face.jpg',
  },
  {
    title: 'Ask Price Seed - Antika Konsol',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/France%2C_18th_century_-_Console_Table_-_1923.225_-_Cleveland_Museum_of_Art.jpg/960px-France%2C_18th_century_-_Console_Table_-_1923.225_-_Cleveland_Museum_of_Art.jpg',
  },
  {
    title: 'Ask Price Seed - Koleksiyon Madeni Para',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Post_medieval%2C_Ottoman_silver_coin_%28FindID_214425%29.jpg/960px-Post_medieval%2C_Ottoman_silver_coin_%28FindID_214425%29.jpg',
  },
  {
    title: 'Ask Price Seed - El Dokuma Hali',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Istanbul_Turkish_and_Islamic_Museum_U%C5%9Fak_carpet_16th_century_in_2006_58_027.jpg/960px-Istanbul_Turkish_and_Islamic_Museum_U%C5%9Fak_carpet_16th_century_in_2006_58_027.jpg',
  },
  {
    title: 'Ask Price Seed - Altin Kolye',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Gold_necklace_MET_DP336810.jpg/960px-Gold_necklace_MET_DP336810.jpg',
  },
  // --- [SEED] ürünleri ---
  {
    title: '[SEED] Gaziantep Bakir Kahve Seti',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Bak%C4%B1r_Cezvede_T%C3%BCrk_Kahvesi.jpg/960px-Bak%C4%B1r_Cezvede_T%C3%BCrk_Kahvesi.jpg',
  },
  {
    title: '[SEED] Bakir Servis Tepsisi',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Beypazar%C4%B1_Sofras%C4%B1.jpg/960px-Beypazar%C4%B1_Sofras%C4%B1.jpg',
  },
  {
    title: '[SEED] Antika Pirinc Masa Lambasi',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Kerosene_lamps_before_1917_Lida_Homeland_Museum_privat_collection_of_Andrei_Fishbein.jpg/960px-Kerosene_lamps_before_1917_Lida_Homeland_Museum_privat_collection_of_Andrei_Fishbein.jpg',
  },
  {
    title: '%Kuru Domates%',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Sun-dried_tomatoes.jpg/960px-Sun-dried_tomatoes.jpg',
  },
  {
    title: '%Yöresel Bal%',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Selection_of_creamed_honey_jars_from_Europe.jpg/960px-Selection_of_creamed_honey_jars_from_Europe.jpg',
  },
  {
    title: '[SEED] Yoresel Organik Bal Paketi',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Selection_of_creamed_honey_jars_from_Europe.jpg/960px-Selection_of_creamed_honey_jars_from_Europe.jpg',
  },
  {
    title: '[SEED] Islemeli Ipek Esarp',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Colored_silk_scarf_from_India_01.jpg/960px-Colored_silk_scarf_from_India_01.jpg',
  },
  {
    title: '[SEED] Kamp Icin Bakir Matara',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Copper_and_Brass_Powder_Flask_with_Scallop_Design.jpg/960px-Copper_and_Brass_Powder_Flask_with_Scallop_Design.jpg',
  },
  {
    title: '[SEED] Ahsap Oymali Dresuar',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Antique_chippendale_buffet.JPG/960px-Antique_chippendale_buffet.JPG',
  },
  {
    title: '[SEED] El Yapimi Seramik Vazo',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/EC_I%2C_Pelos_on_Melos%2C_pottery%2C_NAMA%2C_191063.jpg/960px-EC_I%2C_Pelos_on_Melos%2C_pottery%2C_NAMA%2C_191063.jpg',
  },
  {
    title: '[SEED] Erzurum Oltu Tasi Tesbih',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Hilya-i_Sherif_and_Prayer_Bead_Museum_Portraits_on_black_beads_in_2018_0339.jpg/960px-Hilya-i_Sherif_and_Prayer_Bead_Museum_Portraits_on_black_beads_in_2018_0339.jpg',
  },
  {
    title: '[SEED] Anadolu Desenli Yastik Kilifi',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Farwayart-Vintage-tribal-kilim-pillow7.jpg/960px-Farwayart-Vintage-tribal-kilim-pillow7.jpg',
  },
  {
    title: '[SEED] Kars Kafkas Camasi Koleksiyon',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Bijo_rug-XIX_century.jpg',
  },
  // --- Eski lot ürünleri ---
  {
    title: '1940s Antika Uşak Kilimi%',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Star_Ushak_Carpet_MET_DP270097.jpg/960px-Star_Ushak_Carpet_MET_DP270097.jpg',
  },
  {
    title: 'Saf İpek Hereke Yolluk%',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Hereke_Teppich_410DSC_0030_%2848031233357%29.jpg/960px-Hereke_Teppich_410DSC_0030_%2848031233357%29.jpg',
  },
  {
    title: 'El Dokuması Klasik Isparta Halısı%',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Istanbul_Turkish_and_Islamic_Museum_U%C5%9Fak_carpet_16th_century_in_2006_58_027.jpg/960px-Istanbul_Turkish_and_Islamic_Museum_U%C5%9Fak_carpet_16th_century_in_2006_58_027.jpg',
  },
];

/** Banner slaytları: title.tr → doğrulanmış görsel */
const BANNER_SLIDE_FIXES: Record<string, string> = {
  'Klasik Otomobiller Serisi':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Classic_cars_Canada_late_1960s.jpg/960px-Classic_cars_Canada_late_1960s.jpg',
  'Klasik Arabalar':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Classic_cars_Canada_late_1960s.jpg/960px-Classic_cars_Canada_late_1960s.jpg',
  'Klasik Araba Müzayedesi':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Classic_cars_Canada_late_1960s.jpg/960px-Classic_cars_Canada_late_1960s.jpg',
  'Canlı Antika Müzayedesi':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/2024.05.01_Nowogrodek_Navahrudak_Vintage_Shop_Old_Porcelaine.jpg/1280px-2024.05.01_Nowogrodek_Navahrudak_Vintage_Shop_Old_Porcelaine.jpg',
  'Koleksiyon Pulları':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Music_collection%2C_Postage_stamps%2C_Rostov-on-Don%2C_Russia.jpg/960px-Music_collection%2C_Postage_stamps%2C_Rostov-on-Don%2C_Russia.jpg',
  'Nadir Pullar & Madeni Paralar':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Music_collection%2C_Postage_stamps%2C_Rostov-on-Don%2C_Russia.jpg/960px-Music_collection%2C_Postage_stamps%2C_Rostov-on-Don%2C_Russia.jpg',
  'Madeni Paralar':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Post_medieval%2C_Ottoman_silver_coin_%28FindID_214425%29.jpg/960px-Post_medieval%2C_Ottoman_silver_coin_%28FindID_214425%29.jpg',
  'Tarihi Sikkeler & Madalyalar':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Post_medieval%2C_Ottoman_silver_coin_%28FindID_214425%29.jpg/960px-Post_medieval%2C_Ottoman_silver_coin_%28FindID_214425%29.jpg',
  'Osmanlı Tarihi Eser Müzayedesi':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Ottoman_Manuscript_World_Encyclopedia_%2810739007%29.jpg/960px-Ottoman_Manuscript_World_Encyclopedia_%2810739007%29.jpg',
  'Antika Konsol':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/France%2C_18th_century_-_Console_Table_-_1923.225_-_Cleveland_Museum_of_Art.jpg/960px-France%2C_18th_century_-_Console_Table_-_1923.225_-_Cleveland_Museum_of_Art.jpg',
  'El Yapımı Vintage Mobilyalar':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Antique_chippendale_buffet.JPG/960px-Antique_chippendale_buffet.JPG',
  'El Dokuma İpek Halı':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Hereke_Teppich_410DSC_0030_%2848031233357%29.jpg/960px-Hereke_Teppich_410DSC_0030_%2848031233357%29.jpg',
  'El Dokuma İpek Halılar':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Hereke_Teppich_410DSC_0030_%2848031233357%29.jpg/960px-Hereke_Teppich_410DSC_0030_%2848031233357%29.jpg',
  'Geleneksel El Dokuması Halılar':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Turkish_rugs_for_sale_in_Central_Anatolia_%282%29.jpg/960px-Turkish_rugs_for_sale_in_Central_Anatolia_%282%29.jpg',
  'Sepetine Özel Bilgisayar Teklifi':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Laptop_on_a_neat_desk_%28Unsplash%29.jpg/960px-Laptop_on_a_neat_desk_%28Unsplash%29.jpg',
};

/** Çöp adlı / görselsiz ürünlere sırayla atanacak hazır kimlikler */
const FALLBACK_IDENTITIES = [
  {
    title: 'El Dokuması Peştemal',
    description: 'Pamuklu el dokuması peştemal. Hamam ve plaj kullanımına uygun, püsküllü.',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Fouta_bohemeria.JPG/960px-Fouta_bohemeria.JPG',
  },
  {
    title: 'Ahşap Satranç Takımı',
    description: 'El işçiliği ahşap satranç takımı. Taşları eksiksiz, oyma detaylı.',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Ancient_Wooden_Chess.jpg/960px-Ancient_Wooden_Chess.jpg',
  },
  {
    title: 'El Yapımı Deri Cüzdan',
    description: 'Gerçek deri, el dikişi cüzdan. Doğal kösele, dayanıklı işçilik.',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Aarong_leather_wallet.jpg/960px-Aarong_leather_wallet.jpg',
  },
  {
    title: 'Porselen Türk Kahvesi Fincan Seti',
    description: 'İnce porselen Türk kahvesi fincan takımı. Geleneksel desenli, pirinç detaylı.',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Little_world%2C_Aichi_prefecture_-_Turkish_culture_exhibition_-_Coffee_set.jpg/960px-Little_world%2C_Aichi_prefecture_-_Turkish_culture_exhibition_-_Coffee_set.jpg',
  },
  {
    title: 'El Örmesi Hasır Sepet',
    description: 'El örmesi doğal hasır sepet. Dayanıklı, günlük kullanıma uygun.',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Craftmen_at_work%2C_bamboo_basket_weaving_and_textile_mobile_sculptures%2C_in_Heuan_Chan_heritage_house%2C_Luang_Prabang%2C_Laos.jpg/960px-Craftmen_at_work%2C_bamboo_basket_weaving_and_textile_mobile_sculptures%2C_in_Heuan_Chan_heritage_house%2C_Luang_Prabang%2C_Laos.jpg',
  },
  {
    title: 'El Boyaması Çini Tabak',
    description: 'İznik üslubunda el boyaması çini tabak. Klasik desenli, koleksiyonluk.',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Iznik_pottery%2C_British_Museum%2C_London_-_53477734066.jpg/960px-Iznik_pottery%2C_British_Museum%2C_London_-_53477734066.jpg',
  },
  {
    title: 'Gümüş Telkari Broş',
    description: 'El işi gümüş telkari broş. Şakayık formunda ince işçilik.',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Silver_filigree_brooch_%28shape_of_a_peony%29_exhibited_at_the_Akita_Furusato-mura.jpg/960px-Silver_filigree_brooch_%28shape_of_a_peony%29_exhibited_at_the_Akita_Furusato-mura.jpg',
  },
  {
    title: 'Antika İşlemeli Ayna',
    description: 'Yaldız işlemeli antika ayna. Dönem karakterinde çerçeve, koleksiyonluk parça.',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Antique_mirrors_18.jpg/960px-Antique_mirrors_18.jpg',
  },
  {
    title: 'Antika Pırlanta Yüzük',
    description: 'Dönem işçiliği antika pırlanta yüzük. Zarif montür, koleksiyonluk.',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Antique_Engagement_Ring.jpg/960px-Antique_Engagement_Ring.jpg',
  },
  {
    title: 'Ahşap El Oyması Kaşık Seti',
    description: 'El oyması masif ahşap servis kaşığı seti. Doğal, cilasız ahşap işçiliği.',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/%28%28_street_sales_in_Quito%2C_hand_carved_wooden_products%2C_wooden_spoons_cutting_boards_made_of_solid_wood_hand_made%29%29.jpg/960px-%28%28_street_sales_in_Quito%2C_hand_carved_wooden_products%2C_wooden_spoons_cutting_boards_made_of_solid_wood_hand_made%29%29.jpg',
  },
  {
    title: 'El Örgüsü Yün Atkı',
    description: 'Yumuşak dokulu el örgüsü yün atkı. Doğal iplikten, zarif ajur desenli.',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/CashScarf.JPG/960px-CashScarf.JPG',
  },
  {
    title: 'Antika Porselen Duvar Tabağı',
    description: 'El boyaması antika porselen tabak. Altın yaldız detaylı, sergilemeye uygun.',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/2021.03.30_LIMOGES_HAVILAND_Porcelain_Plate_1888_%E2%80%93_1896_Hand_Painted_with_Berries_01.jpg/960px-2021.03.30_LIMOGES_HAVILAND_Porcelain_Plate_1888_%E2%80%93_1896_Hand_Painted_with_Berries_01.jpg',
  },
];

/** Bu adlar test artığıdır; hem adı hem görseli değiştirilir */
const JUNK_TITLES = ['test', 'tes', 'rtet', 'deneme'];

/** Adı düzgün ama görselsiz kalan bilinen ürünler için birebir görsel */
const KNOWN_IMAGELESS_FIXES: Record<string, string> = {
  Sabun:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Bars_of_pure_Marseille_and_Aleppo_soap%2C_2024.jpg/960px-Bars_of_pure_Marseille_and_Aleppo_soap%2C_2024.jpg',
};

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const em = app.get(EntityManager);

    // 1) Bilinen demo ürünlerinin görsellerini düzelt
    let fixedProducts = 0;
    for (const fix of PRODUCT_FIXES) {
      const where = fix.title.includes('%') ? `title LIKE $2` : `title = $2`;
      const result = await em.query(
        `UPDATE products SET "imageUrl" = $1 WHERE ${where} AND "imageUrl" IS DISTINCT FROM $1`,
        [fix.imageUrl, fix.title],
      );
      fixedProducts += result?.[1] ?? 0;
    }
    console.log(`Ürün görseli düzeltildi: ${fixedProducts}`);

    // 2) Banner slaytları
    const banners: { id: string; items: any[] }[] = await em.query(
      `SELECT id, items FROM banners WHERE items IS NOT NULL`,
    );
    let fixedSlides = 0;
    for (const banner of banners) {
      let changed = false;
      const items = banner.items.map((item: any) => {
        const newUrl = BANNER_SLIDE_FIXES[item?.title?.tr];
        if (newUrl && item.imageUrl !== newUrl) {
          changed = true;
          fixedSlides++;
          return { ...item, imageUrl: newUrl };
        }
        return item;
      });
      if (changed) {
        await em.query(`UPDATE banners SET items = $1 WHERE id = $2`, [
          JSON.stringify(items),
          banner.id,
        ]);
      }
    }
    console.log(`Banner slaytı düzeltildi: ${fixedSlides}`);

    // 3) Çöp adlı veya görselsiz ürünlere hazır kimlik ata
    const junkProducts: { id: string; title: string }[] = await em.query(
      `SELECT id, title FROM products
       WHERE title = ANY($1)
          OR title LIKE 'Phase11%'
          OR title LIKE 'Canli % Muzayede%'
          OR COALESCE("imageUrl", '') = ''
       ORDER BY "createdAt"`,
      [JUNK_TITLES],
    );
    let identityIdx = 0;
    let fixedJunk = 0;
    for (const product of junkProducts) {
      const junkTitle =
        JUNK_TITLES.includes(product.title) ||
        product.title.startsWith('Phase11') ||
        product.title.startsWith('Canli ');

      if (junkTitle) {
        // Ad da anlamsız: sıradaki hazır kimliği ver (ad + açıklama + görsel)
        const identity = FALLBACK_IDENTITIES[identityIdx % FALLBACK_IDENTITIES.length];
        identityIdx++;
        await em.query(
          `UPDATE products SET title = $1, description = $2, "imageUrl" = $3 WHERE id = $4`,
          [identity.title, identity.description, identity.imageUrl, product.id],
        );
        fixedJunk++;
      } else if (KNOWN_IMAGELESS_FIXES[product.title]) {
        // Ad düzgün, görseli bilinen eşleşmeden al
        await em.query(`UPDATE products SET "imageUrl" = $1 WHERE id = $2`, [
          KNOWN_IMAGELESS_FIXES[product.title],
          product.id,
        ]);
        fixedJunk++;
      } else {
        // Ad düzgün ama görsel eşleşmesi bilinmiyor: alakasız görsel atamamak için dokunma
        console.log(`Atlandı (görsel eşleşmesi bilinmiyor): ${product.title}`);
      }
    }
    console.log(`Görselsiz/çöp adlı ürün düzeltildi: ${fixedJunk}`);

    // 4) Dokunulan ürünlerde birincil galeri kaydını garanti et
    const galleryResult = await em.query(
      `INSERT INTO product_images ("productId", url, "sortOrder", "isPrimary")
       SELECT p.id, p."imageUrl", 0, true
       FROM products p
       WHERE p."imageUrl" LIKE '%upload.wikimedia.org%'
         AND NOT EXISTS (SELECT 1 FROM product_images i WHERE i."productId" = p.id)`,
    );
    console.log(`Galeri kaydı eklendi: ${galleryResult?.[1] ?? 0}`);

    // 5) Kalan picsum galeri görsellerini ürünün ana görseline eşitle
    await em.query(
      `UPDATE product_images i SET url = p."imageUrl"
       FROM products p
       WHERE i."productId" = p.id AND i."isPrimary" = true
         AND i.url LIKE '%picsum%' AND p."imageUrl" NOT LIKE '%picsum%'`,
    );
    await em.query(
      `DELETE FROM product_images WHERE url LIKE '%picsum%' AND "isPrimary" = false`,
    );

    console.log('Demo görsel düzeltmeleri tamamlandı.');
  } catch (err) {
    console.error('fix-demo-images hata:', err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

run();
