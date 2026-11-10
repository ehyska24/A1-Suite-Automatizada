
jest.mock('../../models/product', () => ({
  findAll: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn()
}));

jest.mock('../../models/category', () => ({
  findByPk: jest.fn()
}));

const Product = require('../../models/product');
const Category = require('../../models/category');
const ProductService = require('../../services/productService');

describe('ProductService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a product when category exists', async () => {
    const productData = {
      name: 'Laptop',
      categoryId: 1,
      price: 1000
    };

    Category.findByPk.mockResolvedValue({ id: 1 });
    Product.create.mockResolvedValue({
      id: 1,
      ...productData
    });

    const result = await ProductService.createProduct(productData);

    expect(Category.findByPk).toHaveBeenCalledWith(1);
    expect(Product.create).toHaveBeenCalledWith(productData);
    expect(result).toEqual({
      id: 1,
      ...productData
    });
  });

  it('should reject product creation when category does not exist', async () => {
    const productData = {
      name: 'Laptop',
      categoryId: 99,
      price: 1000
    };

    Category.findByPk.mockResolvedValue(null);

    await expect(
      ProductService.createProduct(productData)
    ).rejects.toThrow('Category with id 99 does not exist');

    expect(Category.findByPk).toHaveBeenCalledWith(99);
    expect(Product.create).not.toHaveBeenCalled();
  });

  it('[Válida] should return all products', async () => {
    const products = [
      { id: 1, name: 'Laptop' },
      { id: 2, name: 'Mouse' }
    ];

    Product.findAll.mockResolvedValue(products);

    const result = await ProductService.getAllProducts();

    expect(Product.findAll).toHaveBeenCalledWith();
    expect(result).toEqual(products);
    expect(result).toHaveLength(2);
  });

  it('[Válida] should return a product by ID', async () => {
    const product = { id: 1, name: 'Laptop' };

    Product.findByPk.mockResolvedValue(product);

    const result = await ProductService.getProductById(1);

    expect(Product.findByPk).toHaveBeenCalledWith(1);
    expect(result).toEqual(product);
  });

  it('[Válida] should update a product without changing its category', async () => {
    const updateData = { name: 'Laptop actualizado' };

    Product.update.mockResolvedValue([1]);

    const result = await ProductService.updateProduct(1, updateData);

    expect(Category.findByPk).not.toHaveBeenCalled();
    expect(Product.update).toHaveBeenCalledWith(updateData, {
      where: { id: 1 }
    });
    expect(result).toEqual([1]);
  });

  it('[Válida] should update a product when the new category exists', async () => {
    const updateData = {
      name: 'Laptop actualizado',
      categoryId: 2
    };

    Category.findByPk.mockResolvedValue({ id: 2 });
    Product.update.mockResolvedValue([1]);

    const result = await ProductService.updateProduct(1, updateData);

    expect(Category.findByPk).toHaveBeenCalledWith(2);
    expect(Product.update).toHaveBeenCalledWith(updateData, {
      where: { id: 1 }
    });
    expect(result).toEqual([1]);
  });

  it('[Inválida] should reject updating a product with a nonexistent category', async () => {
    const updateData = {
      name: 'Laptop actualizado',
      categoryId: 99
    };

    Category.findByPk.mockResolvedValue(null);

    await expect(
      ProductService.updateProduct(1, updateData)
    ).rejects.toThrow('Category with id 99 does not exist');

    expect(Category.findByPk).toHaveBeenCalledWith(99);
    expect(Product.update).not.toHaveBeenCalled();
  });

  it('[Válida] should delete a product by ID', async () => {
    Product.destroy.mockResolvedValue(1);

    const result = await ProductService.deleteProduct(1);

    expect(Product.destroy).toHaveBeenCalledWith({
      where: { id: 1 }
    });
    expect(result).toBe(1);
  });

  // Combinación 000: sin sort, sin limit y sin offset.
  it('[Válida] should return products by category without additional options', async () => {
    const products = [
      { id: 1, name: 'Laptop', categoryId: 1 },
      { id: 2, name: 'Mouse', categoryId: 1 }
    ];

    Product.findAll.mockResolvedValue(products);

    const result = await ProductService.getProductsByCategory(1);

    expect(Product.findAll).toHaveBeenCalledWith({
      where: { categoryId: 1 },
      include: Category
    });
    expect(result).toEqual(products);
    expect(result).toHaveLength(2);
  });

  // Combinación 111: con sort, limit y offset.
  it('[Válida] should apply sorting and pagination when retrieving products by category', async () => {
    const products = [
      { id: 1, name: 'Laptop', categoryId: 1 },
      { id: 2, name: 'Mouse', categoryId: 1 }
    ];

    Product.findAll.mockResolvedValue(products);

    const result = await ProductService.getProductsByCategory(1, {
      sort: 'price,DESC',
      limit: '2',
      offset: '1'
    });

    expect(Product.findAll).toHaveBeenCalledWith({
      where: { categoryId: 1 },
      include: Category,
      order: [['price', 'DESC']],
      limit: 2,
      offset: 1
    });
    expect(result).toEqual(products);
    expect(result).toHaveLength(2);
  });

  // Combinación 011: sin sort, con limit y offset.
  it('[Válida] should apply limit and offset without sorting', async () => {
    const products = [
      { id: 1, name: 'Laptop', categoryId: 1 },
      { id: 2, name: 'Mouse', categoryId: 1 }
    ];

    Product.findAll.mockResolvedValue(products);

    const result = await ProductService.getProductsByCategory(1, {
      limit: '2',
      offset: '1'
    });

    expect(Product.findAll).toHaveBeenCalledWith({
      where: { categoryId: 1 },
      include: Category,
      limit: 2,
      offset: 1
    });
    expect(result).toEqual(products);
    expect(result).toHaveLength(2);
  });

  // Combinación 101: con sort y offset, sin limit.
  it('[Válida] should apply sorting and offset without limit', async () => {
    const products = [
      { id: 1, name: 'Laptop', categoryId: 1 },
      { id: 2, name: 'Mouse', categoryId: 1 }
    ];

    Product.findAll.mockResolvedValue(products);

    const result = await ProductService.getProductsByCategory(1, {
      sort: 'price,DESC',
      offset: '1'
    });

    expect(Product.findAll).toHaveBeenCalledWith({
      where: { categoryId: 1 },
      include: Category,
      order: [['price', 'DESC']],
      offset: 1
    });
    expect(result).toEqual(products);
    expect(result).toHaveLength(2);
  });

  // Combinación 110: con sort y limit, sin offset.
  it('[Válida] should apply sorting and limit without offset', async () => {
    const products = [
      { id: 1, name: 'Laptop', categoryId: 1 },
      { id: 2, name: 'Mouse', categoryId: 1 }
    ];

    Product.findAll.mockResolvedValue(products);

    const result = await ProductService.getProductsByCategory(1, {
      sort: 'price,DESC',
      limit: '2'
    });

    expect(Product.findAll).toHaveBeenCalledWith({
      where: { categoryId: 1 },
      include: Category,
      order: [['price', 'DESC']],
      limit: 2
    });
    expect(result).toEqual(products);
    expect(result).toHaveLength(2);
  });

  it('[Válida] should return products from multiple categories', async () => {
    const products = [
      { id: 1, name: 'Laptop', categoryId: 1 },
      { id: 2, name: 'Mouse', categoryId: 2 }
    ];

    Product.findAll.mockResolvedValue(products);

    const result = await ProductService.getProductsByCategories('1,2');

    expect(Product.findAll).toHaveBeenCalledWith({
      where: {
        categoryId: {
          [require('sequelize').Op.in]: [1, 2]
        }
      },
      include: Category
    });
    expect(result).toEqual(products);
    expect(result).toHaveLength(2);
  });

  it('[Válida] should apply sorting and pagination to multiple categories', async () => {
    const products = [
      { id: 1, name: 'Laptop', categoryId: 1 },
      { id: 2, name: 'Mouse', categoryId: 2 }
    ];

    Product.findAll.mockResolvedValue(products);

    const result = await ProductService.getProductsByCategories('1,2', {
      sort: 'price,DESC',
      limit: '5',
      offset: '1'
    });

    expect(Product.findAll).toHaveBeenCalledWith({
      where: {
        categoryId: {
          [require('sequelize').Op.in]: [1, 2]
        }
      },
      include: Category,
      order: [['price', 'DESC']],
      limit: 5,
      offset: 1
    });
    expect(result).toEqual(products);
    expect(result).toHaveLength(2);
  });

  it('[Inválida] should reject retrieving products without category IDs', async () => {
    await expect(
      ProductService.getProductsByCategories('')
    ).rejects.toThrow('Categories parameter is required');

    expect(Product.findAll).not.toHaveBeenCalled();
  });
});
