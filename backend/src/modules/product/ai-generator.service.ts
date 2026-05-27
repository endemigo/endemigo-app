import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeneratedListingContent {
  description: string;
  story: string;
  productContent: string;
}

@Injectable()
export class AiGeneratorService {
  constructor(
    @Optional()
    private readonly configService?: ConfigService,
  ) {}

  /**
   * Generates a description, story, and product content for a product listing based on its title and category.
   * Falls back to high-quality local Turkish templates if no OpenAI API Key is provided.
   */
  async generateListingContent(
    title: string,
    categoryName?: string,
  ): Promise<GeneratedListingContent> {
    const apiKey = this.configService?.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      return this.generateLocalContent(title, categoryName);
    }

    try {
      return await this.generateOpenAiContent(apiKey, title, categoryName);
    } catch (error) {
      // Robustness: Fallback to local generator if OpenAI API fails (e.g. rate limit, network issue, key expired)
      return this.generateLocalContent(title, categoryName);
    }
  }

  /**
   * Generates content using OpenAI's API (gpt-4o-mini).
   */
  private async generateOpenAiContent(
    apiKey: string,
    title: string,
    categoryName?: string,
  ): Promise<GeneratedListingContent> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.configService?.get<string>('OPENAI_CHAT_MODEL') ?? 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Sen premium, yerel ve geleneksel Türk ürünleri satan "Endemigo" e-ticaret platformunun profesyonel pazarlama yazarısın. 
Kullanıcının vereceği Ürün Adı ve Kategori bilgisine dayanarak, bu ürün için çekici, SEO uyumlu ve zengin bir Ürün Açıklaması (description - maksimum 1200 karakter), ürünün kökenini veya zanaatkarını anlatan samimi bir Ürün Hikayesi (story - maksimum 600 karakter) ve ürün özelliklerini (malzeme, beden, paketleme veya renk gibi) özetleyen kısa bir Ürün İçeriği (productContent - maksimum 150 karakter) oluşturmalısın.

Girdi formatı:
Ürün Adı: [ürün adı]
Kategori: [kategori adı]

Yanıtı KESİNLİKLE sadece JSON formatında döndürmelisin. JSON yapısı şu şekilde olmalıdır:
{
  "description": "...",
  "story": "...",
  "productContent": "..."
}
Yanıtında markdown kod bloğu (\`\`\`json ... \`\`\`) veya JSON dışında hiçbir metin olmamalıdır. Yanıt doğrudan parse edilebilir ham JSON olmalıdır.`,
          },
          {
            role: 'user',
            content: `Ürün Adı: ${title}\nKategori: ${categoryName || 'Yöresel Ürün'}`,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API responded with status ${response.status}`);
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const contentText = body.choices?.[0]?.message?.content?.trim() ?? '';
    const parsed = JSON.parse(contentText) as {
      description?: string;
      story?: string;
      productContent?: string;
    };

    if (!parsed.description || !parsed.story || !parsed.productContent) {
      throw new Error('Invalid JSON structure returned by OpenAI');
    }

    return {
      description: parsed.description,
      story: parsed.story,
      productContent: parsed.productContent,
    };
  }

  /**
   * Generates highly relevant, premium Turkish marketing copy locally based on keyword mapping.
   */
  private generateLocalContent(
    title: string,
    categoryName?: string,
  ): GeneratedListingContent {
    const titleLower = title.toLowerCase();
    const categoryLower = categoryName?.toLowerCase() ?? '';

    // 1. Natural Cosmetics / Soaps (Sabun, Krem, Gül Suyu, vb.) - Checked first to prevent conflicts with general words like 'yağ'
    if (
      titleLower.includes('sabun') ||
      titleLower.includes('krem') ||
      titleLower.includes('şampuan') ||
      titleLower.includes('kolonya') ||
      titleLower.includes('tonik') ||
      titleLower.includes('losyon') ||
      categoryLower.includes('kozmetik') ||
      categoryLower.includes('kişisel') ||
      categoryLower.includes('bakım')
    ) {
      return {
        description: `Doğanın şifalı bitkilerinden elde edilen özlerle hazırlanan ${title}, cildinize ve saçınıza hak ettiği doğal bakımı sunar. Hiçbir kimyasal koruyucu, paraben veya sentetik renklendirici içermeyen formülüyle hassas ciltler dahil tüm aile için güvenle kullanılabilir. Doğal yağlar açısından zengin içeriği sayesinde cildinizi derinlemesine nemlendirir, besler ve yeniler. Günlük kişisel bakım ritüelinizi doğal bir arınma seansına dönüştürecek bu yöresel mucize, Endemigo ile doğrudan evinizde.`,
        story: `Bu şifalı ${title}, coğrafyamızın en temiz bitki örtüsüne sahip yamaçlarından toplanan bitki özleri ve geleneksel yöntemlerle kaynatılan doğal yağlar kullanılarak üretilmiştir. Eski şifa reçetelerine sadık kalınarak, çevreye ve insan sağlığına saygılı yerel laboratuvarlarımızda sevgiyle üretilen bu bakım ürünü, doğanın saf enerjisini ve temiz şifa hikayesini banyonuza taşımaktadır.`,
        productContent: `Bitkisel yağlar ve doğal esanslar içerir, kimyasal katkı veya koruyucu içermez.`,
      };
    }

    // 2. Handicrafts / Textiles / Carpets (Kilim, Halı, Bakır, Seramik, El İşleri)
    if (
      titleLower.includes('kilim') ||
      titleLower.includes('halı') ||
      titleLower.includes('bakır') ||
      titleLower.includes('seramik') ||
      titleLower.includes('çömlek') ||
      titleLower.includes('el dokuma') ||
      titleLower.includes('ahşap') ||
      categoryLower.includes('sanat') ||
      categoryLower.includes('dokuma') ||
      categoryLower.includes('bakır')
    ) {
      return {
        description: `Usta zanaatkarlarımızın ellerinde sabır, yetenek ve göz nuruyla şekillenen ${title}, evinizin dekorasyonuna sıcaklık ve asalet katacak benzersiz bir sanat eseridir. Tamamen el işçiliğiyle ve en kaliteli, sürdürülebilir hammaddeler kullanılarak üretilmiştir. Geleneksel motiflerin modern estetikle harmanlandığı bu eşsiz parça, sıradan fabrika üretimlerinin soğukluğundan uzak, yaşayan bir karaktere sahiptir. Uzun yıllar boyunca dayanıklılığını koruyacak ve yaşam alanınızın en değerli köşesini süsleyecek özel bir koleksiyon parçasıdır.`,
        story: `Bu özel ${title}, her bir detayında ve işçiliğinde zanaatkarımızın yıllarını verdiği deneyimi, hayallerini ve kültürel mirasını barındırır. Geleneksel atölyelerimizde, yüzyıllık teknikler sadık kalınarak el emeğiyle dokunmuş/dövülmüş/şekillendirilmiştir. Bu esere sahip olmakla, geçmişin sıcaklığını ve zanaatkarlarımızın ruhunu bugünlere taşıyorsunuz.`,
        productContent: `Tamamen el işçiliğiyle üretilmiştir, geleneksel Anadolu motifleri barındırır.`,
      };
    }

    // 3. Food / Culinary Products (Gıda, Bal, Zeytinyağı, Kahve, Peynir, vb.)
    if (
      titleLower.includes('bal') ||
      titleLower.includes('yağ') ||
      titleLower.includes('peynir') ||
      titleLower.includes('fıstık') ||
      titleLower.includes('kayısı') ||
      titleLower.includes('kahve') ||
      titleLower.includes('çay') ||
      titleLower.includes('lokum') ||
      titleLower.includes('baharat') ||
      categoryLower.includes('gıda') ||
      categoryLower.includes('bal') ||
      categoryLower.includes('yöresel')
    ) {
      return {
        description: `Doğanın sunduğu en saf ve lezzetli tatlardan biri olan ${title}, geleneksel tarım yöntemleriyle, hiçbir yapay katkı maddesi veya koruyucu içermeden tamamen doğal olarak üretilmiştir. Her bir lokmasında/damlasında ait olduğu coğrafyanın zengin aromalarını ve benzersiz şifasını hissedeceksiniz. Sofralarınıza hem sağlık hem de benzersiz bir gurme lezzet katmak için özenle paketlenen bu yöresel lezzet, Endemigo güvencesiyle doğrudan kaynağından kapınıza ulaşıyor. Hem kahvaltılarınızın hem de en özel tariflerinizin vazgeçilmez bir parçası olacak.`,
        story: `Bu eşsiz ${title}, yüzyıllardır aynı sevgi, tutku ve gelenekle topraklarımızı işleyen yerel üreticilerimiz tarafından en temiz koşullarda hasat edilmiştir. Nesilden nesile aktarılan kadim tarım bilgisiyle yetiştirilen ve doğanın ritmine saygı duyularak toplanan bu lezzet, sadece bir gıda ürünü değil; Anadolu'nun bereketli topraklarının, dökülen alın terinin ve doğallığı koruma tutkusunun yaşayan bir hikayesidir.`,
        productContent: `Geleneksel ve katkısız doğal üretim, yöresinden taze hasat ambalaj.`,
      };
    }

    // 4. Generic Fallback
    return {
      description: `En üstün kalite standartlarında, özenle seçilmiş hammaddelerle üretilen ${title}, şıklığı, işlevselliği ve dayanıklılığı bir arada sunar. Hem günlük hayatınızda konforla kullanabileceğiniz hem de yaşam kalitenizi artıracak bu özel ürün, estetik detayları ve premium hissiyle öne çıkmaktadır. Endemigo kalitesi ve güvencesiyle doğrudan yetkin yerel üreticisinden tedarik edilen bu özgün ürün, uzun yıllar keyifle kullanabilmeniz için büyük bir titizlikle hazırlanmıştır.`,
      story: `Bu ${title}, coğrafyamızın zengin değerlerini ve yerel zanaatkarlarımızın/üreticilerimizin eşsiz vizyonunu temsil etmektedir. Büyük bir emek, titizlik ve platformumuzun yerelliği koruma idealiyle hazırlanan bu parça, sürdürülebilir üretimi desteklerken sizlere en orijinal olanı ulaştırma yolculuğumuzun bir parçasıdır. Hikayesi alın teriyle yazılan bu özel ürünü beğeneceğinizi umuyoruz.`,
      productContent: `Orijinal yerel ürün, premium ambalaj standartları.`,
    };
  }
}
