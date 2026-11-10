import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'backend/src/main/resources/catalog/products.json');
const idsPath = path.join(root, 'scripts/unsplash-photo-ids.json');
const outDir = path.join(root, 'frontend/public/images/products');

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const photoIds = JSON.parse(fs.readFileSync(idsPath, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });

const missing = catalog.products.filter((p) => !photoIds[p.sku]).map((p) => p.sku);
if (missing.length > 0) {
  console.error('Missing Unsplash photo IDs for SKUs:', missing.join(', '));
  process.exit(1);
}

async function download(product, index) {
  const photoId = photoIds[product.sku];
  const dest = path.join(outDir, product.imageFile);
  const url = `https://images.unsplash.com/${photoId}?w=600&h=600&fit=crop&q=80`;
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'sample-ecommerce-image-script/1.0' },
  });
  if (!res.ok) {
    throw new Error(`Failed ${product.sku} ${product.imageFile}: ${res.status} (${photoId})`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) {
    throw new Error(`Suspiciously small file for ${product.sku}: ${buf.length} bytes`);
  }
  fs.writeFileSync(dest, buf);
  console.log(`[${index + 1}/${catalog.products.length}] ${product.sku} → ${product.imageFile}`);
}

for (let i = 0; i < catalog.products.length; i++) {
  let attempt = 0;
  while (true) {
    try {
      await download(catalog.products[i], i);
      break;
    } catch (err) {
      attempt += 1;
      if (attempt >= 4) throw err;
      console.warn(`Retry ${attempt} for ${catalog.products[i].sku}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  await new Promise((r) => setTimeout(r, 200));
}

console.log('Done. Images in', outDir);
console.log('Photos sourced from Unsplash (https://unsplash.com) for this sample shop.');
