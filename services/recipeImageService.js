const cache = new Map();
const photoCache = new Map();
const CACHE_MS = 24 * 60 * 60 * 1000;

exports.findForRecipe = async (title) => {
  const key = String(title || '').trim().toLowerCase();
  if (!key) return null;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.image;

  const query = new URLSearchParams({
    q: `${title} food`,
    license: 'cc0,pdm,by,by-sa',
    mature: 'false',
    filter_dead: 'true',
    page_size: '5'
  });

  try {
    const response = await fetch(`https://api.openverse.engineering/v1/images/?${query}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) {
      console.warn(`Openverse photo search returned HTTP ${response.status}.`);
      return null;
    }
    const data = await response.json();
    const result = (data.results || []).find(item =>
      item && item.mature !== true && ['cc0', 'pdm', 'by', 'by-sa'].includes(String(item.license).toLowerCase()) &&
      isOpenverseThumbnail(item.thumbnail) && isHttpUrl(item.foreign_landing_url) && isHttpUrl(item.license_url)
    );
    const image = result ? {
      url: result.thumbnail,
      title: String(result.title || title),
      creator: String(result.creator || 'Unknown creator'),
      sourceUrl: result.foreign_landing_url,
      license: String(result.license).toUpperCase(),
      licenseUrl: result.license_url
    } : null;
    if (result) photoCache.set(result.id, image);
    cache.set(key, { image, expiresAt: Date.now() + CACHE_MS });
    return image;
  } catch (error) {
    if (error.name !== 'TimeoutError' && error.name !== 'AbortError') {
      console.warn('Recipe photo search is temporarily unavailable.');
    }
    return null;
  }
};

exports.resolveSavedPhoto = async (thumbnailUrl) => {
  const id = imageIdFromThumbnail(thumbnailUrl);
  if (!id) return null;
  if (photoCache.has(id)) return photoCache.get(id);

  try {
    const response = await fetch(`https://api.openverse.engineering/v1/images/${id}/`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return null;
    const item = await response.json();
    if (item.mature === true || !['cc0', 'pdm', 'by', 'by-sa'].includes(String(item.license).toLowerCase()) ||
        !isOpenverseThumbnail(item.thumbnail) || imageIdFromThumbnail(item.thumbnail) !== id ||
        !isHttpUrl(item.foreign_landing_url) || !isHttpUrl(item.license_url)) return null;
    const photo = {
      url: item.thumbnail,
      title: String(item.title || 'Untitled photo'),
      creator: String(item.creator || 'Unknown creator'),
      sourceUrl: item.foreign_landing_url,
      license: String(item.license).toUpperCase(),
      licenseUrl: item.license_url
    };
    photoCache.set(id, photo);
    return photo;
  } catch {
    return null;
  }
};

function isOpenverseThumbnail(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['api.openverse.org', 'api.openverse.engineering'].includes(url.hostname) && /^\/v1\/images\/[\w-]+\/thumb\/$/.test(url.pathname);
  } catch {
    return false;
  }
}

function imageIdFromThumbnail(value) {
  try {
    const url = new URL(value);
    const match = url.protocol === 'https:' && ['api.openverse.org', 'api.openverse.engineering'].includes(url.hostname)
      ? url.pathname.match(/^\/v1\/images\/([\w-]+)\/thumb\/$/)
      : null;
    return match?.[1] || null;
  } catch {
    return null;
  }
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}
