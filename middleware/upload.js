// Validate uploaded photos, then store them in Supabase Storage on Vercel.
// Local development keeps using public/uploads so the app still works offline.
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const folder = path.join(__dirname, '..', 'public', 'uploads');
const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => acceptedTypes.has(file.mimetype)
    ? cb(null, true)
    : cb(Object.assign(new Error('Choose a JPG, PNG, WebP, or GIF image.'), { code: 'INVALID_IMAGE_TYPE' }))
});

function detectImage(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'jpg';
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))) return 'gif';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

function supabaseStorageConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'recipe_images';
  if (!url || !key) throw new Error('Recipe photo storage is not configured.');
  return { url, key, bucket };
}

function storageHeaders(key, json = false) {
  return {
    apikey: key,
    // New Supabase secret keys belong in apikey only; legacy service_role JWTs
    // also need Authorization for compatibility with older projects.
    ...(!key.startsWith('sb_secret_') ? { Authorization: `Bearer ${key}` } : {}),
    ...(json ? { 'Content-Type': 'application/json' } : {})
  };
}

async function storeInSupabase(file, extension) {
  const { url, key, bucket } = supabaseStorageConfig();
  const objectPath = `${crypto.randomUUID()}.${extension}`;
  const endpoint = `${url}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { ...storageHeaders(key), 'Content-Type': file.mimetype, 'x-upsert': 'false' },
    body: file.buffer
  });
  if (!response.ok) {
    console.error('Supabase photo upload failed:', response.status);
    throw new Error('The photo could not be saved. Please try again.');
  }
  return `${url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath}`;
}

async function storeLocally(file, extension) {
  await fs.promises.mkdir(folder, { recursive: true });
  const filename = `${crypto.randomUUID()}.${extension}`;
  await fs.promises.writeFile(path.join(folder, filename), file.buffer, { flag: 'wx' });
  return `/uploads/${filename}`;
}

exports.single = upload.single('image');
exports.persistValidatedImage = async (req, res, next) => {
  if (!req.file) return next();
  try {
    const extension = detectImage(req.file.buffer);
    if (!extension) return next(Object.assign(new Error('The uploaded file is not a supported image.'), { code: 'INVALID_IMAGE_TYPE' }));
    req.file.imagePath = process.env.VERCEL === '1'
      ? await storeInSupabase(req.file, extension)
      : await storeLocally(req.file, extension);
    next();
  } catch (error) {
    next(error);
  }
};

exports.removeImage = async (imagePath) => {
  if (!imagePath) return;
  if (imagePath.startsWith('/uploads/')) {
    const root = path.resolve(folder);
    const target = path.resolve(root, path.basename(imagePath));
    if (target.startsWith(root + path.sep)) {
      await fs.promises.unlink(target).catch(error => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
    return;
  }

  let config;
  try {
    config = supabaseStorageConfig();
  } catch {
    return;
  }
  const prefix = `${config.url}/storage/v1/object/public/${encodeURIComponent(config.bucket)}/`;
  if (!imagePath.startsWith(prefix)) return;
  const objectPath = decodeURIComponent(imagePath.slice(prefix.length));
  const response = await fetch(`${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}`, {
    method: 'DELETE',
    headers: storageHeaders(config.key, true),
    body: JSON.stringify({ prefixes: [objectPath] })
  });
  if (!response.ok) console.error('Supabase photo cleanup failed:', response.status);
};
