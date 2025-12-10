import mapboxgl from 'mapbox-gl';

/**
 * Converts longitude to tile x coordinate
 */
function long2tile(lon, zoom) {
    return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
}

/**
 * Converts latitude to tile y coordinate
 */
function lat2tile(lat, zoom) {
    return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));
}

/**
 * Helper to get the tileset ID from a source URL
 * @param {string} url 
 * @returns {string|null}
 */
function getTilesetId(url) {
    if (!url || !url.startsWith('mapbox://')) return null;
    return url.replace('mapbox://', '');
}

/**
 * Preloads tiles for a specific map state (center, zoom)
 * This is a best-effort approach. It calculates the visible tiles for the target
 * state and attempts to fetch them using the Mapbox API.
 * 
 * Note: Mapbox GL JS attaches a dynamic 'sku' session parameter to requests.
 * We cannot easily replicate this without internal access. 
 * However, fetching these resources might still help warm DNS/TCP connections
 * or hit the browser cache if the SKU matches or isn't strictly enforced for caching keys.
 * 
 * @param {mapboxgl.Map} map - The Mapbox map instance
 * @param {Object} chapter - The target chapter object {center: [lon, lat], zoom: number}
 */
export async function preloadChapter(map, chapter) {
    if (!map || !chapter || !chapter.center) return;

    const { center, zoom } = chapter;
    const lng = center[0];
    const lat = center[1];

    // Tiles are typically cached at integer zoom levels.
    // We preload for the target zoom, grounded to integer.
    const z = Math.floor(zoom);
    const x = long2tile(lng, z);
    const y = lat2tile(lat, z);

    // Define a set of tiles to fetch. 
    // We fetch the center tile and its immediate neighbors (3x3 grid).
    // This covers the central view area.
    const radius = 1;
    const tilesToFetch = [];

    for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
            tilesToFetch.push({ z, x: x + dx, y: y + dy });
        }
    }

    // Safe guard: Ensure style is loaded before accessing it
    if (!map.isStyleLoaded()) {
        map.once('styledata', () => preloadChapter(map, chapter));
        return;
    }

    // Get current style sources to construct URLs
    const style = map.getStyle();
    if (!style || !style.sources) return;

    const sources = Object.values(style.sources);
    const token = map._requestManager?._customAccessToken || mapboxgl.accessToken;

    sources.forEach(source => {
        // 1. Vector Tiles
        if (source.type === 'vector' && source.url && source.url.startsWith('mapbox://')) {
            const tilesetId = getTilesetId(source.url);
            if (tilesetId) {
                tilesToFetch.forEach(({ z, x, y }) => {
                    // Construct standard Mapbox API URL
                    // Note: We omit the 'sku' parameter as we can't generate a valid one reliably.
                    const url = `https://api.mapbox.com/v4/${tilesetId}/${z}/${x}/${y}.vector.pbf?access_token=${token}`;

                    // Fire and forget fetch to warm cache
                    fetch(url, { mode: 'cors', priority: 'low' }).catch(() => { });
                });
            }
        }

        // 2. Raster Tiles (Satellite, etc.)
        if (source.type === 'raster' && source.url && source.url.startsWith('mapbox://')) {
            const tilesetId = getTilesetId(source.url);
            if (tilesetId) {
                tilesToFetch.forEach(({ z, x, y }) => {
                    // Raster tiles are typically 256x256 or 512x512
                    // @2x for retina if needed, but we stick to standard for preload
                    const url = `https://api.mapbox.com/v4/${tilesetId}/${z}/${x}/${y}.webp?access_token=${token}`;

                    // Preload as image
                    const img = new Image();
                    img.src = url;
                });
            }
        }
    });
}
