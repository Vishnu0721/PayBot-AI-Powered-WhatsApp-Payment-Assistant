import { Product } from '../models/Product.js';
import { asyncHandler, HttpError } from '../utils/http.js';

export const listProducts = asyncHandler(async (req, res) => {
  const includeInactive = String(req.query.all) === 'true';
  const filter = { sellerId: req.sellerId };
  if (!includeInactive) filter.active = true;
  const products = await Product.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, products: products.map((p) => p.toPublic()) });
});

export const createProduct = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const description = String(req.body?.description || '').trim();
  const price = Number(req.body?.price);

  if (!name) throw new HttpError(400, 'Enter a product name.', 'NAME_REQUIRED');
  if (!Number.isFinite(price) || price < 1) {
    throw new HttpError(400, 'Enter a valid price.', 'INVALID_PRICE');
  }

  const product = await Product.create({
    sellerId: req.sellerId,
    name: name.slice(0, 80),
    description: description.slice(0, 200),
    price: Math.round(price),
    active: true,
  });

  res.status(201).json({ success: true, product: product.toPublic() });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, sellerId: req.sellerId });
  if (!product) throw new HttpError(404, 'Product not found.', 'NOT_FOUND');

  if (req.body?.name !== undefined) {
    const name = String(req.body.name).trim();
    if (!name) throw new HttpError(400, 'Enter a product name.', 'NAME_REQUIRED');
    product.name = name.slice(0, 80);
  }
  if (req.body?.description !== undefined) {
    product.description = String(req.body.description).trim().slice(0, 200);
  }
  if (req.body?.price !== undefined) {
    const price = Number(req.body.price);
    if (!Number.isFinite(price) || price < 1) {
      throw new HttpError(400, 'Enter a valid price.', 'INVALID_PRICE');
    }
    product.price = Math.round(price);
  }
  if (req.body?.active !== undefined) {
    product.active = Boolean(req.body.active);
  }

  await product.save();
  res.json({ success: true, product: product.toPublic() });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, sellerId: req.sellerId });
  if (!product) throw new HttpError(404, 'Product not found.', 'NOT_FOUND');
  product.active = false;
  await product.save();
  res.json({ success: true, product: product.toPublic() });
});
