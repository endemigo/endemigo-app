import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { Category } from './entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UserService } from '../user/user.service';
import { ProductStatus } from '../../shared/types/product-status.enum';
import { RC } from '../../shared/constants/response-codes';
import { STORAGE_SERVICE } from '../../shared/storage/storage.interface';
import type { IStorageService } from '../../shared/storage/storage.interface';

const MAX_IMAGES = 10;

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly imageRepo: Repository<ProductImage>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly userService: UserService,
    @Inject(STORAGE_SERVICE)
    private readonly storage: IStorageService,
  ) {}

  // ==========================================
  // Create Product
  // ==========================================

  async create(sellerId: string, dto: CreateProductDto) {
    const user = await this.userService.findById(sellerId);
    if (!user || !user.isSeller) {
      throw new ForbiddenException({ code: RC.SELLER_REQUIRED, message: 'Sadece satıcılar ürün ekleyebilir' });
    }

    const product = this.productRepo.create({
      ...dto,
      sellerId,
      status: ProductStatus.DRAFT,
    });
    const saved = await this.productRepo.save(product);
    const full = await this.findById(saved.id);

    return { code: RC.PRODUCT_CREATED, message: 'Ürün oluşturuldu', ...full };
  }

  // ==========================================
  // Update Product
  // ==========================================

  async update(sellerId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException({ code: RC.PRODUCT_NOT_FOUND, message: 'Ürün bulunamadı' });
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException({ code: RC.NOT_PRODUCT_OWNER, message: 'Bu ürün size ait değil' });
    }

    Object.assign(product, dto);
    await this.productRepo.save(product);

    const full = await this.findById(productId);
    return { code: RC.PRODUCT_UPDATED, message: 'Ürün güncellendi', ...full };
  }

  // ==========================================
  // Delete Product (soft)
  // ==========================================

  async remove(sellerId: string, productId: string) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException({ code: RC.PRODUCT_NOT_FOUND, message: 'Ürün bulunamadı' });
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException({ code: RC.NOT_PRODUCT_OWNER, message: 'Bu ürün size ait değil' });
    }

    await this.productRepo.softDelete(productId);
    return { code: RC.PRODUCT_DELETED, message: 'Ürün silindi' };
  }

  // ==========================================
  // Image Upload
  // ==========================================

  async uploadImage(sellerId: string, productId: string, file: Express.Multer.File) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['images'],
    });
    if (!product) throw new NotFoundException({ code: RC.PRODUCT_NOT_FOUND, message: 'Ürün bulunamadı' });
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException({ code: RC.NOT_PRODUCT_OWNER, message: 'Bu ürün size ait değil' });
    }

    const imageCount = product.images?.length || 0;
    if (imageCount >= MAX_IMAGES) {
      throw new BadRequestException({ code: RC.MAX_IMAGES_REACHED, message: `Maksimum ${MAX_IMAGES} görsel yüklenebilir` });
    }

    const url = await this.storage.upload(file, `products/${productId}`);
    const isPrimary = imageCount === 0;

    const image = this.imageRepo.create({
      productId,
      url,
      sortOrder: imageCount,
      isPrimary,
    });
    await this.imageRepo.save(image);

    // Keep imageUrl synced with primary
    if (isPrimary) {
      product.imageUrl = url;
      await this.productRepo.save(product);
    }

    return { code: RC.IMAGE_UPLOADED, message: 'Görsel yüklendi', image };
  }

  async deleteImage(sellerId: string, imageId: string) {
    const image = await this.imageRepo.findOne({
      where: { id: imageId },
      relations: ['product'],
    });
    if (!image) throw new NotFoundException({ code: RC.PRODUCT_NOT_FOUND, message: 'Görsel bulunamadı' });
    if (image.product.sellerId !== sellerId) {
      throw new ForbiddenException({ code: RC.NOT_PRODUCT_OWNER, message: 'Bu ürün size ait değil' });
    }

    await this.storage.delete(image.url);
    await this.imageRepo.softDelete(imageId);

    // If primary was deleted, promote next image
    if (image.isPrimary) {
      const nextImage = await this.imageRepo.findOne({
        where: { productId: image.productId },
        order: { sortOrder: 'ASC' },
      });
      if (nextImage) {
        nextImage.isPrimary = true;
        await this.imageRepo.save(nextImage);
        await this.productRepo.update(image.productId, { imageUrl: nextImage.url });
      } else {
        await this.productRepo.update(image.productId, { imageUrl: '' });
      }
    }

    return { code: RC.IMAGE_DELETED, message: 'Görsel silindi' };
  }

  // ==========================================
  // List — Public
  // ==========================================

  async findAll(page = 1, limit = 20) {
    const [items, total] = await this.productRepo.findAndCount({
      where: { status: ProductStatus.ACTIVE },
      relations: ['category', 'seller', 'images'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: items.map((p) => this.toResponse(p)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==========================================
  // My Products — Seller's own products
  // ==========================================

  async findMyProducts(sellerId: string, page = 1, limit = 20) {
    const [items, total] = await this.productRepo.findAndCount({
      where: { sellerId },
      relations: ['category', 'images'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: items.map((p) => this.toResponse(p)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==========================================
  // Find by ID
  // ==========================================

  async findById(id: string) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['category', 'seller', 'images'],
    });
    if (!product) throw new NotFoundException({ code: RC.PRODUCT_NOT_FOUND, message: 'Ürün bulunamadı' });
    return this.toResponse(product);
  }

  // ==========================================
  // Categories
  // ==========================================

  async findCategories() {
    const roots = await this.categoryRepo.find({
      where: { parentId: IsNull(), isActive: true },
      relations: ['children'],
      order: { sortOrder: 'ASC' },
    });

    return roots.map((root) => ({
      ...root,
      children: root.children?.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder) || [],
    }));
  }

  async seedCategories() {
    const categories = [
      { name: 'Elektronik', slug: 'elektronik', sortOrder: 1, children: ['Cep Telefonu', 'Bilgisayar', 'Tablet'] },
      { name: 'Antika & Koleksiyon', slug: 'antika-koleksiyon', sortOrder: 2, children: ['Antika Mobilya', 'Koleksiyon', 'Pul & Para'] },
      { name: 'Sanat', slug: 'sanat', sortOrder: 3, children: ['Resim', 'Heykel', 'Fotoğraf'] },
      { name: 'Halı & Kilim', slug: 'hali-kilim', sortOrder: 4, children: ['El Halısı', 'Makine Halısı', 'Kilim'] },
      { name: 'Mücevher & Saat', slug: 'mucevher-saat', sortOrder: 5, children: ['Altın', 'Gümüş', 'Saat'] },
      { name: 'Mobilya & Dekor', slug: 'mobilya-dekor', sortOrder: 6, children: ['Salon', 'Yatak Odası', 'Bahçe'] },
      { name: 'Kıyafet & Aksesuar', slug: 'kiyafet-aksesuar', sortOrder: 7, children: ['Kadın', 'Erkek', 'Aksesuar'] },
      { name: 'Spor & Outdoor', slug: 'spor-outdoor', sortOrder: 8, children: ['Fitness', 'Kamp', 'Bisiklet'] },
      { name: 'Yöresel Ürünler', slug: 'yoresel-urunler', sortOrder: 9, children: ['Gıda', 'El İşi', 'Hediyelik'] },
    ];

    for (const cat of categories) {
      let parent = await this.categoryRepo.findOne({ where: { slug: cat.slug } });
      if (!parent) {
        parent = await this.categoryRepo.save(
          this.categoryRepo.create({ name: cat.name, slug: cat.slug, sortOrder: cat.sortOrder }),
        );
      }

      // Seed children
      for (let i = 0; i < cat.children.length; i++) {
        const childSlug = `${cat.slug}-${cat.children[i].toLowerCase().replace(/[^a-z0-9ğüşıöç]/gi, '-')}`;
        const exists = await this.categoryRepo.findOne({ where: { slug: childSlug } });
        if (!exists) {
          await this.categoryRepo.save(
            this.categoryRepo.create({
              name: cat.children[i],
              slug: childSlug,
              parentId: parent.id,
              sortOrder: i + 1,
            }),
          );
        }
      }
    }

    return this.findCategories();
  }

  // ==========================================
  // Response Mapper
  // ==========================================

  private toResponse(product: Product) {
    return {
      id: product.id,
      title: product.title,
      description: product.description,
      price: Number(product.price),
      imageUrl: product.imageUrl,
      images: product.images?.map((img) => ({
        id: img.id,
        url: img.url,
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
      })) || [],
      status: product.status,
      sellerId: product.sellerId,
      sellerName: product.seller
        ? `${product.seller.firstName || ''} ${product.seller.lastName || ''}`.trim()
        : null,
      categoryId: product.categoryId,
      categoryName: product.category?.name || null,
      // Phase 3 fields
      stockQuantity: product.stockQuantity,
      sku: product.sku,
      geoIndicationCertNo: product.geoIndicationCertNo,
      geoIndicationRegion: product.geoIndicationRegion,
      originCountry: product.originCountry,
      originRegion: product.originRegion,
      condition: product.condition,
      listingType: product.listingType,
      dimensionWidth: product.dimensionWidth ? Number(product.dimensionWidth) : null,
      dimensionHeight: product.dimensionHeight ? Number(product.dimensionHeight) : null,
      dimensionDepth: product.dimensionDepth ? Number(product.dimensionDepth) : null,
      weight: product.weight ? Number(product.weight) : null,
      createdAt: product.createdAt,
    };
  }
}
