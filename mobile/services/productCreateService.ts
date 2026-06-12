import { ProductStatus } from '../../shared-types/enums/product-status.enum.ts';
import api from '../lib/api';
import ENV from '../lib/config';
import { mockService } from '../lib/mockService';
import { queryClient } from '../lib/queryClient';
import {
  PRODUCT_CREATE_LISTING_TYPES,
  type ProductCreateImageDraft,
  type ProductCreateWizardState,
} from '../types/productCreate.ts';
import { buildAuctionCreatePayload, buildProductCreatePayload } from '../utils/productCreateMapper.ts';
import { buildProductImageUploadFile } from '../utils/productImageUpload.ts';

interface ProductCreateResponse {
  id: string;
  code: string;
  message: string;
}

interface AuctionCreateResponse {
  id: string;
  code: string;
  message: string;
}

async function createProduct(state: ProductCreateWizardState) {
  if (ENV.USE_MOCK) {
    return mockService.createProduct(buildProductCreatePayload(state));
  }

  const { data } = await api.post<ProductCreateResponse>(
    '/products',
    buildProductCreatePayload(state),
  );
  return data;
}

async function uploadProductImage(productId: string, image: ProductCreateImageDraft) {
  if (ENV.USE_MOCK) {
    await mockService.uploadProductImage(productId, image);
    return;
  }

  const formData = new FormData();
  formData.append('file', buildProductImageUploadFile(image));

  await api.post(`/products/${productId}/images`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

async function publishProduct(productId: string) {
  if (ENV.USE_MOCK) {
    const mockRes = await mockService.publishProduct(productId);
    return { status: ProductStatus.ACTIVE, ...mockRes };
  }

  const { data } = await api.patch(`/products/${productId}`, {
    status: ProductStatus.ACTIVE,
  });
  return data;
}

async function createAuction(productId: string, state: ProductCreateWizardState) {
  if (ENV.USE_MOCK) {
    return mockService.createAuction(buildAuctionCreatePayload(productId, state));
  }

  const { data } = await api.post<AuctionCreateResponse>(
    '/auctions',
    buildAuctionCreatePayload(productId, state),
  );
  return data;
}

async function publishAuction(auctionId: string) {
  if (ENV.USE_MOCK) {
    return mockService.publishAuction(auctionId);
  }

  return api.patch(`/auctions/${auctionId}/publish`);
}

async function applyToEvent(eventId: string, productId: string, state: ProductCreateWizardState) {
  if (ENV.USE_MOCK) {
    return { id: 'mock-auction-id', code: 'SUCCESS', message: 'Başvuru alındı' };
  }

  const { data } = await api.post(
    `/auctions/events/${eventId}/apply`,
    buildAuctionCreatePayload(productId, state),
  );
  return data;
}

export async function submitProductCreateWizard(
  state: ProductCreateWizardState,
  images: ProductCreateImageDraft[],
  existingProductId?: string,
) {
  let product = existingProductId
    ? { id: existingProductId, code: 'EXISTING_PRODUCT_SELECTED', message: 'Existing product selected.', status: ProductStatus.ACTIVE }
    : await createProduct(state);

  if (!existingProductId) {
    for (const image of images) {
      await uploadProductImage(product.id, image);
    }
  }

  const published = await publishProduct(product.id);
  if (published && published.status) {
    product = { ...product, status: published.status };
  }

  if (state.listingType === PRODUCT_CREATE_LISTING_TYPES.AUCTION) {
    if (state.selectedEventId) {
      await applyToEvent(state.selectedEventId, product.id, state);
    } else {
      const auction = await createAuction(product.id, state);
      await publishAuction(auction.id);
    }
  }

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['products'] }),
    queryClient.invalidateQueries({ queryKey: ['auctions'] }),
  ]);

  return product;
}

export async function generateAiContent(
  title: string,
  categoryName?: string,
): Promise<{ description: string; story: string; productContent?: string }> {
  if (ENV.USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate network lag
    return mockAiContent(title, categoryName);
  }

  const { data } = await api.post<{ description: string; story: string; productContent?: string }>(
    '/products/generate-content',
    { title, categoryName },
  );
  return data;
}

function mockAiContent(title: string, categoryName?: string) {
  const titleLower = title.toLowerCase();
  const categoryLower = categoryName?.toLowerCase() ?? '';

  if (
    titleLower.includes('sabun') ||
    titleLower.includes('krem') ||
    titleLower.includes('şampuan') ||
    titleLower.includes('kolonya') ||
    categoryLower.includes('kozmetik') ||
    categoryLower.includes('kişisel') ||
    categoryLower.includes('bakım')
  ) {
    return {
      description: `Doğanın şifalı bitkilerinden elde edilen özlerle hazırlanan ${title}, cildinize ve saçınıza hak ettiği doğal bakımı sunar. Hiçbir kimyasal koruyucu, paraben veya sentetik renklendirici içermeyen formülüyle hassas ciltler dahil tüm aile için güvenle kullanılabilir. Doğal yağlar açısından zengin içeriği sayesinde cildinizi derinlemesine nemlendirir, besler ve yeniler. Günlük kişisel bakım ritüelinizi doğal bir arınma seansına dönüştürecek bu yöresel mucize.`,
      story: `Bu şifalı ${title}, coğrafyamızın en temiz bitki örtüsüne sahip yamaçlarından toplanan bitki özleri ve geleneksel yöntemlerle kaynatılan doğal yağlar kullanılarak üretilmiştir. Eski şifa reçetelerine sadık kalınarak, çevreye ve insan sağlığına saygılı yerel laboratuvarlarımızda sevgiyle üretilen bu bakım ürünü, doğanın saf enerjisini ve temiz şifa hikayesini banyonuza taşımaktadır.`,
      productContent: `Bitkisel yağlar ve doğal esanslar içerir, kimyasal katkı veya koruyucu içermez.`,
    };
  }

  if (
    titleLower.includes('kilim') ||
    titleLower.includes('halı') ||
    titleLower.includes('bakır') ||
    titleLower.includes('seramik') ||
    titleLower.includes('çömlek') ||
    titleLower.includes('el dokuma') ||
    categoryLower.includes('sanat') ||
    categoryLower.includes('dokuma')
  ) {
    return {
      description: `Usta zanaatkarlarımızın ellerinde sabır, yetenek ve göz nuruyla şekillenen ${title}, evinizin dekorasyonuna sıcaklık ve asalet katacak benzersiz bir sanat eseridir. Tamamen el işçiliğiyle ve en kaliteli, sürdürülebilir hammaddeler kullanılarak üretilmiştir. Geleneksel motiflerin modern estetikle harmanlandığı bu eşsiz parça, sıradan fabrika üretimlerinin soğukluğundan uzak, yaşayan bir karaktere sahiptir.`,
      story: `Bu özel ${title}, her bir detayında ve işçiliğinde zanaatkarımızın yıllarını verdiği deneyimi, hayallerini ve kültürel mirasını barındırır. Anadolu'nun geleneksel atölyelerinde, yüzyıllık teknikler sadık kalınarak el emeğiyle dokunmuş/dövülmüş/şekillendirilmiştir. Bu esere sahip olmakla, geçmişin sıcaklığını bugünlere taşıyorsunuz.`,
      productContent: `Tamamen el işçiliğiyle üretilmiştir, geleneksel Anadolu motifleri barındırır.`,
    };
  }

  if (
    titleLower.includes('bal') ||
    titleLower.includes('yağ') ||
    titleLower.includes('peynir') ||
    titleLower.includes('fıstık') ||
    titleLower.includes('kayısı') ||
    titleLower.includes('kahve') ||
    categoryLower.includes('gıda') ||
    categoryLower.includes('bal') ||
    categoryLower.includes('yöresel')
  ) {
    return {
      description: `Doğanın sunduğu en saf ve lezzetli tatlardan biri olan ${title}, geleneksel tarım yöntemleriyle, hiçbir yapay katkı maddesi veya koruyucu içermeden tamamen doğal olarak üretilmiştir. Her bir lokmasında/damlasında ait olduğu coğrafyanın zengin aromalarını ve benzersiz şifasını hissedeceksiniz. Sofralarınıza hem sağlık hem de benzersiz bir gurme lezzet katmak için özenle paketlenen bu yöresel lezzet.`,
      story: `Bu eşsiz ${title}, yüzyıllardır aynı sevgi, tutku ve gelenekle topraklarımızı işleyen yerel üreticilerimiz tarafından en temiz koşullarda hasat edilmiştir. Nesilden nesile aktarılan kadim tarım bilgisiyle yetiştirilen ve doğanın ritmine saygı duyularak toplanan bu lezzet, sadece bir gıda ürünü değil, Anadolu'nun bereketli topraklarının ve alın terinin hikayesidir.`,
      productContent: `Geleneksel ve katkısız doğal üretim, yöresinden taze hasat ambalaj.`,
    };
  }

  return {
    description: `En üstün kalite standartlarında, özenle seçilmiş hammaddelerle üretilen ${title}, şıklığı, işlevselliği ve dayanıklılığı bir arada sunar. Hem günlük hayatınızda konforla kullanabileceğiniz hem de yaşam kalitenizi artıracak bu özel ürün, estetik detayları ve premium hissiyle öne çıkmaktadır. Endemigo kalitesi ve güvencesiyle doğrudan yetkin yerel üreticisinden tedarik edilen bu özgün ürün, uzun yıllar keyifle kullanabilmeniz için büyük bir titizlikle hazırlanmıştır.`,
    story: `Bu ${title}, coğrafyamızın zengin değerlerini ve yerel zanaatkarlarımızın/üreticilerimizin eşsiz vizyonunu temsil etmektedir. Büyük bir emek, titizlik ve platformumuzun yerelliği koruma idealiyle hazırlanan bu parça, sürdürülebilir üretimi desteklerken sizlere en orijinal olanı ulaştırma yolculuğumuzun bir parçasıdır.`,
    productContent: `Orijinal yerel ürün, premium ambalaj standartları.`,
  };
}
