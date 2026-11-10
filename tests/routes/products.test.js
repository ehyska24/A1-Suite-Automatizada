
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const { initTestDb, closeTestDb } = require('../setup/testDb');

const productRouter = require('../../routes/products');

const Product = require('../../models/product');
const Category = require('../../models/category');

const app = express();
app.use(bodyParser.json());
app.use('/api/products', productRouter);

describe('Product Routes', () => {
  beforeAll(async () => {
    await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await Product.destroy({ where: {} });
    await Category.destroy({ where: {} });
  });

  it('[Inválida] should reject product creation when category does not exist', async () => {
    const productData = {
      name: 'Test Product',
      price: 100,
      inventory: 10,
      categoryId: 999
    };

    const response = await request(app)
      .post('/api/products')
      .send(productData)
      .expect(400);

    expect(response.body.error).toBe(
      'Category with id 999 does not exist'
    );

    const products = await Product.findAll();

    expect(products).toHaveLength(0);
  });

  it('[Válida] should return products filtered by category', async () => {
    const category1 = await Category.create({
      name: 'Electronics'
    });

    const category2 = await Category.create({
      name: 'Books'
    });

    await Product.create({
      name: 'Laptop',
      price: 850,
      inventory: 10,
      categoryId: category1.id
    });

    await Product.create({
      name: 'Mouse',
      price: 25,
      inventory: 20,
      categoryId: category1.id
    });

    await Product.create({
      name: 'Novel',
      price: 15,
      inventory: 30,
      categoryId: category2.id
    });

    const response = await request(app)
      .get(`/api/products/category/${category1.id}`)
      .expect(200);

    expect(response.body).toHaveLength(2);

    const productNames = response.body.map(product => product.name);

    expect(productNames).toContain('Laptop');
    expect(productNames).toContain('Mouse');
    expect(productNames).not.toContain('Novel');

    response.body.forEach(product => {
      expect(Number(product.categoryId)).toBe(category1.id);
    });
  });
});
