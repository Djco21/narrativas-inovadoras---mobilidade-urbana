import { useEffect, useRef, useState } from 'react';
import * as turf from '@turf/turf';

// Helper to calculate total length of a Feature (LineString or MultiLineString)
const calculateTotalLength = (geojson) => {
    if (!geojson) return 0;
    return turf.length(geojson);
};

export const useRouteAnimation = (mapInstance, sourceId2D, sourceId3D, originalGeoJSON, config) => {
    const { visible, speed = 10 } = config;

    // Animation state
    const progressRef = useRef(0); // 0 to 1
    const animationFrameRef = useRef();
    const lastTimeRef = useRef();

    // Process GeoJSON once
    const [processedGeoJSON, setProcessedGeoJSON] = useState(null);
    const [totalLength, setTotalLength] = useState(0);

    useEffect(() => {
        if (originalGeoJSON) {
            // Flatten to ensure we have a list of LineStrings
            // If it's a LineString, flatten returns 1 feature. If Multi, returns many.
            const flattened = turf.flatten(originalGeoJSON);
            let features = flattened.features;

            // Greedy Sort to chain segments
            // This is essential for OSM data which often comes in random order
            if (features.length > 1) {
                const sorted = [];
                const pool = [...features];

                // Pick the first one (arbitrary or could try to find 'start')
                // For now, we trust the first one or just pick index 0
                let current = pool.shift();
                sorted.push(current);

                while (pool.length > 0) {
                    const tail = current.geometry.coordinates[current.geometry.coordinates.length - 1];

                    // Find closest start or end in pool
                    let closestIndex = -1;
                    let minDistance = Infinity;
                    let shouldReverse = false;

                    for (let i = 0; i < pool.length; i++) {
                        const f = pool[i];
                        const fStart = f.geometry.coordinates[0];
                        const fEnd = f.geometry.coordinates[f.geometry.coordinates.length - 1];

                        const distStart = turf.distance(tail, fStart);
                        const distEnd = turf.distance(tail, fEnd);

                        if (distStart < minDistance) {
                            minDistance = distStart;
                            closestIndex = i;
                            shouldReverse = false;
                        }
                        if (distEnd < minDistance) {
                            minDistance = distEnd;
                            closestIndex = i;
                            shouldReverse = true;
                        }
                    }

                    if (closestIndex !== -1 && minDistance < 1.0) { // < 1km tolerance (generous)
                        const nextFeature = pool.splice(closestIndex, 1)[0];
                        if (shouldReverse) {
                            nextFeature.geometry.coordinates.reverse();
                        }
                        sorted.push(nextFeature);
                        current = nextFeature;
                    } else {
                        // usage discontinuity or gap, just pick next available
                        const nextFeature = pool.shift();
                        sorted.push(nextFeature);
                        current = nextFeature;
                    }
                }
                features = sorted;
            }

            setProcessedGeoJSON(turf.featureCollection(features));
            setTotalLength(turf.length(turf.featureCollection(features)));
        }
    }, [originalGeoJSON]);

    useEffect(() => {
        if (!mapInstance || !processedGeoJSON || totalLength === 0) return;

        const animate = (time) => {
            if (!lastTimeRef.current) lastTimeRef.current = time;
            const deltaTime = (time - lastTimeRef.current) / 1000; // seconds
            lastTimeRef.current = time;

            // Determine target progress
            const target = visible ? 1 : 0;

            // Calculate step based on speed
            // Speed = fraction of path per second? Or relative?
            // Let's say speed 1 = 2 seconds to complete?
            // Let's align: Speed 1 = 20% per second (5s total).
            // This is tunable.
            const rate = 0.2 * speed;

            let delta = 0;
            if (progressRef.current < target) {
                delta = rate * deltaTime;
                progressRef.current = Math.min(progressRef.current + delta, target);
            } else if (progressRef.current > target) {
                delta = -rate * deltaTime; // Disappear at same speed
                progressRef.current = Math.max(progressRef.current + delta, target);
            }

            // Optimization: Skip if static at target (and not first frame) (removed to always allow updates during reverse)

            // Calculate current drawing length
            const targetDist = progressRef.current * totalLength;

            // Generate sliced GeoJSON
            // We need to accumulate segments until we reach targetDist
            const outputFeatures = [];
            let coveredDist = 0;

            try {
                for (const feature of processedGeoJSON.features) {
                    const segmentLen = turf.length(feature);

                    if (coveredDist + segmentLen <= targetDist) {
                        // Fully included
                        outputFeatures.push(feature);
                        coveredDist += segmentLen;
                    } else if (coveredDist < targetDist) {
                        // Partially included
                        const remaining = targetDist - coveredDist;
                        // LineSliceAlong requires distance > 0 and <= length
                        if (remaining > 0) {
                            const sliced = turf.lineSliceAlong(feature, 0, remaining);
                            outputFeatures.push(sliced);
                        }
                        coveredDist += remaining; // Matches targetDist approx
                        break;
                    } else {
                        // Not reached yet
                        break;
                    }
                }

                const currentData = turf.featureCollection(outputFeatures);

                // Update 2D Source (The Line)
                const source2D = mapInstance.getSource(sourceId2D);
                if (source2D) {
                    source2D.setData(currentData);
                }

                // Update 3D Source (The Extrusion) - heavy operation
                // We buffer the CURRENT path
                const source3D = mapInstance.getSource(sourceId3D);
                if (source3D) {
                    // If progress is 0, empty data
                    if (progressRef.current <= 0.001 || outputFeatures.length === 0) {
                        source3D.setData(turf.featureCollection([]));
                    } else {
                        // Flatten collection for buffer or buffer each?
                        // Buffer on FeatureCollection works? Yes.
                        // But buffer might return MultiPolygon.
                        // Try/catch just in case

                        const buffered = turf.buffer(currentData, 0.015, { units: 'kilometers' }); // 15m radius
                        if (buffered) source3D.setData(buffered);
                    }
                }
            } catch (e) {
                console.error("Animation error", e);
            }

            // Continue loop if not reached target
            if (progressRef.current !== target || (target === 1 && progressRef.current < 1)) {
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        };

        // Start loop
        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [mapInstance, processedGeoJSON, totalLength, visible, speed, sourceId2D, sourceId3D]);

    return progressRef.current;
};
