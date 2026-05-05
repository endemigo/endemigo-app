import { RC } from '../../shared/constants/response-codes';
import { CategoryController, ProductController } from './product.controller';
import { ProductService } from './product.service';

describe('ProductController', () => {
  const createProductController = () => {
    const productService = {
      findAll: jest.fn().mockResolvedValue({
        code: RC.PRODUCT_LIST,
        message: 'Products fetched',
        items: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }),
      findMyProducts: jest.fn(),
    } as unknown as ProductService;

    return {
      controller: new ProductController(productService),
      productService,
    };
  };

  it('rejects non-finite public pagination query values', async () => {
    const { controller, productService } = createProductController();

    await expect(
      controller.findAll('abc' as never, '20' as never),
    ).rejects.toMatchObject({
      response: { code: RC.VALIDATION_ERROR },
    });
    expect(productService.findAll).not.toHaveBeenCalled();
  });

  it('rejects non-finite seller pagination query values', async () => {
    const { controller, productService } = createProductController();

    await expect(
      controller.findMyProducts('seller-1', '1' as never, 'bad' as never),
    ).rejects.toMatchObject({
      response: { code: RC.VALIDATION_ERROR },
    });
    expect(productService.findMyProducts).not.toHaveBeenCalled();
  });
});

describe('CategoryController', () => {
  it('returns category list in a response-code envelope', async () => {
    const productService = {
      findCategories: jest.fn().mockResolvedValue({
        code: RC.CATEGORY_LIST,
        message: 'Categories fetched',
        categories: [],
      }),
    } as unknown as ProductService;
    const controller = new CategoryController(productService);

    await expect(controller.findAll()).resolves.toMatchObject({
      code: RC.CATEGORY_LIST,
      categories: [],
    });
  });
});
