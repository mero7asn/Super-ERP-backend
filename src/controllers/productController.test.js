const test = require('node:test');
const assert = require('node:assert/strict');
const productController = require('./productController');
const Product = require('../models/Product');
const SystemSetting = require('../models/SystemSetting');

test('createProduct rejects prices below the configured minimum product price', async () => {
  const originalFindOne = Product.findOne;
  const originalCreate = Product.create;
  const originalSettingFindOne = SystemSetting.findOne;

  Product.findOne = async () => null;
  Product.create = async () => {
    throw new Error('product should not be created when below minimum price');
  };
  SystemSetting.findOne = async ({ key }) => {
    if (key === 'productPriceMin') {
      return { value: 100 };
    }
    return null;
  };

  const req = {
    body: {
      name: 'Test Product',
      sku: 'TEST-001',
      price: 99,
      description: 'A test product',
      imageUrl: '',
      status: 'Active',
    },
    user: { _id: 'user-1', role: 'Sales Agent' },
  };
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  await productController.createProduct(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Minimum price/);

  Product.findOne = originalFindOne;
  Product.create = originalCreate;
  SystemSetting.findOne = originalSettingFindOne;
});
