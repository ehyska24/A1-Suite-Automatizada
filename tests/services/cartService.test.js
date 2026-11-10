
jest.mock('../../models/cart', () => ({
  create: jest.fn(),
  findByPk: jest.fn()
}));

jest.mock('../../models/cartItem', () => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  findByPk: jest.fn()
}));

jest.mock('../../models/product', () => ({
  findByPk: jest.fn()
}));

const CartService = require('../../services/cartService');
const Cart = require('../../models/cart');
const CartItem = require('../../models/cartItem');
const Product = require('../../models/product');

describe('CartService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCart', () => {
    it('should create a new cart', async () => {
      const expectedCart = {
        id: 1,
        userId: 10,
        status: 'open'
      };

      Cart.create.mockResolvedValue(expectedCart);

      const result = await CartService.createCart(10);

      expect(Cart.create).toHaveBeenCalledWith({ userId: 10 });
      expect(result).toEqual(expectedCart);
      expect(result.status).toBe('open');
    });
  });

  describe('addItemToCart', () => {
    it('should add new item to cart when product exists and has sufficient inventory', async () => {
      const mockProduct = {
        id: 1,
        inventory: 10,
        price: 100
      };

      const mockCartItem = {
        id: 1,
        cartId: 1,
        productId: 1,
        quantity: 2
      };

      Product.findByPk.mockResolvedValue(mockProduct);
      CartItem.findOne.mockResolvedValue(null);
      CartItem.create.mockResolvedValue(mockCartItem);

      const result = await CartService.addItemToCart(1, 1, 2);

      expect(Product.findByPk).toHaveBeenCalledWith(1);
      expect(CartItem.findOne).toHaveBeenCalledWith({
        where: { cartId: 1, productId: 1 }
      });
      expect(CartItem.create).toHaveBeenCalledWith({
        cartId: 1,
        productId: 1,
        quantity: 2
      });
      expect(result).toEqual(mockCartItem);
      expect(result.quantity).toBe(2);
    });

    it('should reject adding a nonexistent product', async () => {
      Product.findByPk.mockResolvedValue(null);

      await expect(
        CartService.addItemToCart(1, 999, 2)
      ).rejects.toThrow('Product not found');

      expect(Product.findByPk).toHaveBeenCalledWith(999);
      expect(CartItem.create).not.toHaveBeenCalled();
    });

    it('should reject quantity greater than available inventory', async () => {
      Product.findByPk.mockResolvedValue({
        id: 1,
        inventory: 10
      });

      await expect(
        CartService.addItemToCart(1, 1, 11)
      ).rejects.toThrow('Not enough inventory available');

      expect(CartItem.create).not.toHaveBeenCalled();
    });

    it('should reject zero quantity', async () => {
      Product.findByPk.mockResolvedValue({
        id: 1,
        inventory: 10
      });

      await expect(
        CartService.addItemToCart(1, 1, 0)
      ).rejects.toThrow();

      expect(CartItem.create).not.toHaveBeenCalled();
    });

    it('should reject negative quantity', async () => {
      Product.findByPk.mockResolvedValue({
        id: 1,
        inventory: 10
      });

      await expect(
        CartService.addItemToCart(1, 1, -2)
      ).rejects.toThrow();

      expect(CartItem.create).not.toHaveBeenCalled();
    });
  });

  describe('getCartItems', () => {
    it('should return cart items with calculated totals', async () => {
      const mockCart = { id: 1 };

      const mockItem = {
        id: 1,
        quantity: 2,
        Product: {
          price: 100,
          taxRate: 0.10
        },
        toJSON: () => ({
          id: 1,
          quantity: 2,
          Product: {
            price: 100,
            taxRate: 0.10
          }
        })
      };

      Cart.findByPk.mockResolvedValue(mockCart);
      CartItem.findAll.mockResolvedValue([mockItem]);

      const result = await CartService.getCartItems(1);

      expect(Cart.findByPk).toHaveBeenCalledWith(1);
      expect(CartItem.findAll).toHaveBeenCalledWith({
        where: { cartId: 1 },
        include: Product
      });
      expect(result.items).toHaveLength(1);
      expect(result.summary.subtotal).toBe(200);
      expect(result.summary.totalTax).toBe(20);
      expect(result.summary.total).toBe(220);
      expect(result.items[0].itemSubtotal).toBe(200);
      expect(result.items[0].itemTax).toBe(20);
    });
  });

  describe('updateCartItem', () => {
    it('should update cart item quantity when sufficient inventory', async () => {
      const mockItem = {
        id: 1,
        quantity: 2,
        Product: { inventory: 10 },
        save: jest.fn().mockResolvedValue(true)
      };

      CartItem.findByPk.mockResolvedValue(mockItem);

      const result = await CartService.updateCartItem(1, 5);

      expect(CartItem.findByPk).toHaveBeenCalledWith(1, {
        include: Product
      });
      expect(mockItem.quantity).toBe(5);
      expect(mockItem.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockItem);
    });
  });

  describe('removeCartItem', () => {
    it('should remove cart item successfully', async () => {
      const mockItem = {
        id: 1,
        destroy: jest.fn().mockResolvedValue(true)
      };

      CartItem.findByPk.mockResolvedValue(mockItem);

      await CartService.removeCartItem(1);

      expect(CartItem.findByPk).toHaveBeenCalledWith(1);
      expect(mockItem.destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('addItemToCart - existing item', () => {
    it('[Válida] should increase quantity when product already exists in cart', async () => {
      const mockProduct = {
        id: 1,
        inventory: 10
      };

      const mockExistingItem = {
        id: 1,
        cartId: 1,
        productId: 1,
        quantity: 2,
        save: jest.fn().mockResolvedValue(true)
      };

      Product.findByPk.mockResolvedValue(mockProduct);
      CartItem.findOne.mockResolvedValue(mockExistingItem);

      const result = await CartService.addItemToCart(1, 1, 3);

      expect(CartItem.findOne).toHaveBeenCalledWith({
        where: { cartId: 1, productId: 1 }
      });
      expect(mockExistingItem.quantity).toBe(5);
      expect(mockExistingItem.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockExistingItem);
    });

    it('[Inválida] should reject increasing quantity beyond available inventory', async () => {
      const mockProduct = {
        id: 1,
        inventory: 4
      };

      const mockExistingItem = {
        id: 1,
        cartId: 1,
        productId: 1,
        quantity: 3,
        save: jest.fn()
      };

      Product.findByPk.mockResolvedValue(mockProduct);
      CartItem.findOne.mockResolvedValue(mockExistingItem);

      await expect(
        CartService.addItemToCart(1, 1, 2)
      ).rejects.toThrow('Not enough inventory available');

      expect(mockExistingItem.quantity).toBe(3);
      expect(mockExistingItem.save).not.toHaveBeenCalled();
    });
  });

  describe('getCartItems - additional scenarios', () => {
    it('[Inválida] should reject a non-numeric cart ID', async () => {
      await expect(
        CartService.getCartItems('abc')
      ).rejects.toThrow('Cart ID should be a number');

      expect(Cart.findByPk).not.toHaveBeenCalled();
      expect(CartItem.findAll).not.toHaveBeenCalled();
    });

    it('[Inválida] should return null when cart does not exist', async () => {
      Cart.findByPk.mockResolvedValue(null);

      const result = await CartService.getCartItems(999);

      expect(Cart.findByPk).toHaveBeenCalledWith(999);
      expect(CartItem.findAll).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('updateCartItem - additional scenarios', () => {
    it('[Inválida] should reject updating a nonexistent cart item', async () => {
      CartItem.findByPk.mockResolvedValue(null);

      await expect(
        CartService.updateCartItem(999, 2)
      ).rejects.toThrow('Item not found');

      expect(CartItem.findByPk).toHaveBeenCalledWith(999, {
        include: Product
      });
    });

    it('[Inválida] should reject updating quantity beyond available inventory', async () => {
      const mockItem = {
        id: 1,
        quantity: 2,
        Product: { inventory: 4 },
        save: jest.fn()
      };

      CartItem.findByPk.mockResolvedValue(mockItem);

      await expect(
        CartService.updateCartItem(1, 5)
      ).rejects.toThrow('Not enough inventory available');

      expect(mockItem.quantity).toBe(2);
      expect(mockItem.save).not.toHaveBeenCalled();
    });
  });

  describe('removeCartItem - additional scenarios', () => {
    it('[Inválida] should reject removing a nonexistent cart item', async () => {
      CartItem.findByPk.mockResolvedValue(null);

      await expect(
        CartService.removeCartItem(999)
      ).rejects.toThrow('Item not found');

      expect(CartItem.findByPk).toHaveBeenCalledWith(999);
    });
  });
});
