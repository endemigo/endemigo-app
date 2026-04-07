import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly userService: UserService,
  ) {}

  async create(sellerId: string, dto: CreateProductDto) {
    // Check seller status
    const user = await this.userService.findById(sellerId);
    if (!user || !user.isSeller) {
      throw new ForbiddenException('Sadece satıcılar ürün ekleyebilir');
    }

    const product = this.productRepo.create({
      ...dto,
      sellerId,
    });
    const saved = await this.productRepo.save(product);
    return this.findById(saved.id);
  }

  async findAll(page = 1, limit = 20) {
    const [items, total] = await this.productRepo.findAndCount({
      where: { status: 'active' as any },
      relations: ['category', 'seller'],
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

  async findById(id: string) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['category', 'seller'],
    });
    if (!product) throw new NotFoundException('Ürün bulunamadı');
    return this.toResponse(product);
  }

  async findCategories() {
    return this.categoryRepo.find({ order: { sortOrder: 'ASC' } });
  }

  async seedCategories() {
    const categories = [
      { name: 'Elektronik', slug: 'elektronik', sortOrder: 1 },
      { name: 'Antika & Koleksiyon', slug: 'antika-koleksiyon', sortOrder: 2 },
      { name: 'Sanat', slug: 'sanat', sortOrder: 3 },
      { name: 'Halı & Kilim', slug: 'hali-kilim', sortOrder: 4 },
      { name: 'Mücevher & Saat', slug: 'mucevher-saat', sortOrder: 5 },
      { name: 'Mobilya & Dekor', slug: 'mobilya-dekor', sortOrder: 6 },
      { name: 'Kıyafet & Aksesuar', slug: 'kiyafet-aksesuar', sortOrder: 7 },
      { name: 'Spor & Outdoor', slug: 'spor-outdoor', sortOrder: 8 },
      { name: 'Diğer', slug: 'diger', sortOrder: 9 },
    ];

    for (const cat of categories) {
      const exists = await this.categoryRepo.findOne({ where: { slug: cat.slug } });
      if (!exists) {
        await this.categoryRepo.save(this.categoryRepo.create(cat));
      }
    }
    return this.findCategories();
  }

  private toResponse(product: Product) {
    return {
      id: product.id,
      title: product.title,
      description: product.description,
      price: Number(product.price),
      imageUrl: product.imageUrl,
      status: product.status,
      sellerId: product.sellerId,
      sellerName: product.seller
        ? `${product.seller.firstName || ''} ${product.seller.lastName || ''}`.trim()
        : null,
      categoryId: product.categoryId,
      categoryName: product.category?.name || null,
      createdAt: product.createdAt,
    };
  }
}
