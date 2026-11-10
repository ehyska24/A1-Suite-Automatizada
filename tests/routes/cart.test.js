
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const { initTestDb, closeTestDb } = require('../setup/testDb');

const cartRouter = require('../../routes/cart');

const Cart = require('../../models/cart');
const CartItem = require('../../models/cartItem');
const Product = require('../../models/product');
const Category = require('../../models/category');

const app = express();
app.use(bodyParser.json());
app.use('/api/carts', cartRouter);

describe('Cart Routes', () => {
  beforeAll(async () => {
    await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await CartItem.destroy({ where: {} });
    await Cart.destroy({ where: {} });
    await Product.destroy({ where: {} });
    await Category.destroy({ where: {} });
  });

  it('[Válida] should create a new cart', async () => {
    const response = await request(app)
      .post('/api/carts/10')
      .send({})
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(Number(response.body.userId)).toBe(10);
    expect(response.body.status).toBe('open');
  });

  it('[Válida] should add item to cart', async () => {
    const category = await Category.create({
      name: 'Test Category'
    });

    const product = await Product.create({
      name: 'Test Product',
      price: 100,
      inventory: 10,
      taxRate: 0.10,
      categoryId: category.id
    });

    const cart = await Cart.create({
      userId: 10
    });

    const response = await request(app)
      .post(`/api/carts/${cart.id}/items`)
      .send({
        productId: product.id,
        quantity: 2
      })
      .expect(201);

    expect(Number(response.body.cartId)).toBe(cart.id);
expect(Number(response.body.productId)).toBe(product.id);
    expect(response.body.productId).toBe(product.id);
    expect(response.body.quantity).toBe(2);

    const savedItem = await CartItem.findByPk(response.body.id);

    expect(Number(savedItem.cartId)).toBe(cart.id);
expect(Number(savedItem.productId)).toBe(product.id);
    expect(savedItem.productId).toBe(product.id);
    expect(savedItem.quantity).toBe(2);
  });
});
