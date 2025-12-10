/* eslint-disable no-restricted-globals */

// Recife Metropolitan Area Bounding Box (Approx)
// SW: [-35.1, -8.4]
// NE: [-34.8, -7.9]
const DEFAULT_BBOX = [-35.1000, -8.4000, -34.8000, -7.9000];

// Zoom levels to preload
// 10-12 covers the region largely. 
// 13-14 adds detail for street level.
const ZOOM_LEVELS = [10, 11, 12, 13, 14];

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

self.onmessage = function (e) {
    const { token, styleSources } = e.data;

    if (!token) return;

    console.log('[Tile Prefetch Worker] Starting prefetch for Recife...');

    const queue = [];

    // 1. Generate Tile Queue
    ZOOM_LEVELS.forEach(z => {
        const xMin = long2tile(DEFAULT_BBOX[0], z);
        const xMax = long2tile(DEFAULT_BBOX[2], z);
        const yMin = lat2tile(DEFAULT_BBOX[3], z); // Latitude is inverted (North is +) but tile Y goes down
        const yMax = lat2tile(DEFAULT_BBOX[1], z);

        // Swap if min > max due to coordinate system details (y goes down in OSM/Google/Mapbox)
        const yStart = Math.min(yMin, yMax);
        const yEnd = Math.max(yMin, yMax);

        for (let x = xMin; x <= xMax; x++) {
            for (let y = yStart; y <= yEnd; y++) {
                queue.push({ z, x, y });
            }
        }
    });

    console.log(`[Tile Prefetch Worker] Generated ${queue.length} tiles to fetch.`);

    // 2. Process Queue with Concurrency Limit
    // We don't want to kill the network, just saturate it reasonably.
    const CONCURRENCY = 6;
    let activeRequests = 0;
    let index = 0;

    function processNext() {
        if (index >= queue.length) {
            if (activeRequests === 0) {
                console.log('[Tile Prefetch Worker] Finished.');
            }
            return;
        }

        while (activeRequests < CONCURRENCY && index < queue.length) {
            const tile = queue[index++];
            activeRequests++;
            fetchTile(tile, token, styleSources).finally(() => {
                activeRequests--;
                processNext();
            });
        }
    }

    processNext();
};

async function fetchTile({ z, x, y }, token, styleSources) {
    // We need to guess the URL or use the passed sources.
    // For standard Mapbox styles, it's usually mapbox-streets-v8 (vector).
    // Ideally, we'd use the sources passed from main thread.

    // Simplification for reliability: Hardcode Mapbox Streets v8 for vector tiles
    // as it's the base of most styles.
    // If we wanted to be perfect, we'd parse the styleSources.

    const tilesetId = 'mapbox.mapbox-streets-v8,mapbox.mapbox-terrain-v2';
    // Terrain is crucial for pitch/3D.

    const url = `https://api.mapbox.com/v4/${tilesetId}/${z}/${x}/${y}.vector.pbf?sku=101&access_token=${token}`;

    try {
        const response = await fetch(url, { mode: 'cors', priority: 'low' });
        if (!response.ok) {
            // console.warn(`[Prefetch] Failed ${z}/${x}/${y}: ${response.status}`);
        }
    } catch (err) {
        // console.warn(`[Prefetch] Error ${z}/${x}/${y}`, err);
    }
}
