import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion';
import * as turf from '@turf/turf';
import mapboxgl from 'mapbox-gl'

import 'mapbox-gl/dist/mapbox-gl.css';

import './App.css'
import InteractionBlocker from './InteractionBlocker';
import { MapInteractionContext } from './MapInteractionContext';
import routeData from './assets/route.json';
import extraRouteData from './assets/osm_elements_part5.json';
import { preloadChapter } from './preloadUtils';
import AlarmScreen from './AlarmScreen';
import Content from './Content';

import PrologueSection from './PrologueSection';
import DevCameraHUD from './DevCameraHUD';
import { theme } from './theme';


// preloadChapter('est-camaragibe');

const chapters = {
  'start': {
    center: [-34.8959673, -8.0760724],
    zoom: 11,
    pitch: 45,
    bearing: 0
  },
  'est-camaragibe': {
    "center": [
      -34.992555,
      -8.024181
    ],
    "zoom": 16,
    "pitch": 71.6,
    "bearing": 104.76
  },
  'camaragibe-recife': {
    "center": [
      -34.938408,
      -8.077322
    ],
    "zoom": 12,
    "pitch": 0,
    "bearing": 45.82
  },
  'est-recife': {
    "center": [
      -34.879366,
      -8.067496
    ],
    "zoom": 15,
    "pitch": 58.95,
    "bearing": 66.24
  },
  'novotel': {
    "center": [
      -34.875888,
      -8.070171
    ],
    "zoom": 16,
    "pitch": 66.79,
    "bearing": 12.79
  },
  'derby': {
    "center": [
      -34.896803,
      -8.061814
    ],
    "zoom": 14,
    "pitch": 0,
    "bearing": 0
  },
  'derby-camaragibe': {
    "center": [
      -34.939333,
      -8.059397
    ],
    "zoom": 12,
    "pitch": 0,
    "bearing": 0
  },
  'conde-boa-vista': {
    "center": [
      -34.940673,
      -8.047805
    ],
    "zoom": 12,
    "pitch": 10.5,
    "bearing": 50.73
  }
};

function App() {

  const mapRef = useRef()
  const mapContainerRef = useRef()

  // Control Alarm visibility
  const [showAlarm, setShowAlarm] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const alarmParam = params.get('alarm');
    if (alarmParam !== null) return alarmParam === 'true';
    // Default: False in Dev, True in Prod
    return !import.meta.env.DEV;
  });
  const alarmVisibleRef = useRef(showAlarm);

  useEffect(() => {
    alarmVisibleRef.current = showAlarm;
    if (showAlarm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [showAlarm]);

  const isTouringRef = useRef(true);

  // Function to handle alarm dismissal
  const handleAlarmDismiss = () => {
    setShowAlarm(false);
    if (mapRef.current) {
      mapRef.current.flyTo({
        ...chapters['est-camaragibe'],
        essential: true,
        duration: 3000 // Slower fly for effect
      });
    }
  };

  // Register Service Worker for Tile Caching
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  // State to track map position (optional) - Removed to prevent re-renders

  // Track map instance for DevHUD
  const [mapInstance, setMapInstance] = useState(null);

  // Buffer the routes for 3D extrusion
  const routeBuffered = useMemo(() => {
    return turf.buffer(routeData, 0.008, { units: 'kilometers' }); // 15m radius
  }, []);

  const extraRouteBuffered = useMemo(() => {
    return turf.buffer(extraRouteData, 0.005, { units: 'kilometers' }); // 15m radius
  }, []);

  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZGpjbzIxIiwiYSI6ImNtaXA3cDBlejBhaW0zZG9sbXZpOHFhYnQifQ.Bo43glKkuVwj310Z-L58oQ'

    // Backward Tour: Start at the END (camaragibe-recife) if alarm is shown
    const initialView = showAlarm ? chapters['camaragibe-recife'] : chapters['start'];

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: theme.map.style,
      center: initialView.center,
      zoom: initialView.zoom,
      pitch: initialView.pitch,
      bearing: initialView.bearing,
    });

    mapRef.current = map;
    setMapInstance(map);
    window.map = map; // For debugging/verification

    // Disable scroll zoom
    map.scrollZoom.disable();

    // Update state on move - Removed to prevent re-renders

    mapRef.current.on('load', () => {
      console.log('Current Projection:', mapRef.current.getProjection().name);
      console.log('Camera Options:', mapRef.current.getFreeCameraOptions());

      if (theme.map.camera) {
        // Redundant safely check or runtime switch
        mapRef.current.setCamera(theme.map.camera);
      }

      // Find the first symbol layer to insert other layers below it (so labels stay on top)
      const layers = mapRef.current.getStyle().layers;
      const labelLayerId = layers.find(
        (layer) => layer.type === 'symbol' && layer.layout['text-field']
      ).id;

      // 1. Min-width Fallback Lines (Lowest Priority)
      mapRef.current.addSource('extra-route-min', {
        type: 'geojson',
        data: extraRouteData
      });

      mapRef.current.addLayer({
        id: 'extra-route-min',
        type: 'line',
        source: 'extra-route-min',
        paint: {
          'line-color': theme.colors.transport.busLine,
          'line-width': theme.map.layers.lineWidth,
          'line-opacity': 1
        }
      }, labelLayerId);

      mapRef.current.addSource('route-min', {
        type: 'geojson',
        data: routeData
      });

      mapRef.current.addLayer({
        id: 'route-min',
        type: 'line',
        source: 'route-min',
        paint: {
          'line-color': theme.colors.transport.metroLine,
          'line-width': theme.map.layers.lineWidth,
          'line-opacity': 1
        }
      }, labelLayerId);

      // 2. 3D Buildings (Fill-Extrusion)
      mapRef.current.addLayer(
        {
          'id': 'add-3d-buildings',
          'source': 'composite',
          'source-layer': 'building',
          'filter': ['==', 'extrude', 'true'],
          'type': 'fill-extrusion',
          'minzoom': 15,
          'paint': {
            'fill-extrusion-opacity': 1,
            'fill-extrusion-color': theme.colors.transport.buildings,
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'height']
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 1
          }
        },
        labelLayerId
      );

      // 3. Route Extrusions (Highest Priority 3D)
      mapRef.current.addSource('extra-route', {
        type: 'geojson',
        data: extraRouteBuffered
      });

      mapRef.current.addLayer({
        id: 'extra-route',
        type: 'fill-extrusion',
        source: 'extra-route',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': theme.colors.transport.busLine, // Bus/Blue
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            theme.map.layers.extrusionHeight
          ],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 1
        }
      }, labelLayerId);

      mapRef.current.addSource('route', {
        type: 'geojson',
        data: routeBuffered
      });

      mapRef.current.addLayer({
        id: 'route',
        type: 'fill-extrusion',
        source: 'route',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': theme.colors.transport.metroLine, // Metro/Orange
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            theme.map.layers.extrusionHeight
          ],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 1
        }
      }, labelLayerId);

      // Initialize Flashlight Effect Layers (From Remote)
      const layersToEffect = ['poi-label', 'transit-label', 'road-label', 'road-number-shield', 'road-exit-shield'];
      layersToEffect.forEach(layerId => {
        if (mapRef.current.getLayer(layerId)) {
          mapRef.current.setPaintProperty(layerId, 'text-opacity', [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            1,
            0
          ]);
          mapRef.current.setPaintProperty(layerId, 'icon-opacity', [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            1,
            0
          ]);
          mapRef.current.setPaintProperty(layerId, 'text-opacity-transition', { duration: 300, delay: 0 });
          mapRef.current.setPaintProperty(layerId, 'icon-opacity-transition', { duration: 300, delay: 0 });
        }
      });

      if (showAlarm) {
        const chapterKeys = Object.keys(chapters);
        // We want to go from end BACK to start
        let currentIndex = chapterKeys.length - 1;

        const playNextStep = () => {
          // Check if tour is still active (alarm still visible)
          if (!alarmVisibleRef.current) return;

          currentIndex--;
          if (currentIndex < 0) {
            return;
          }

          const targetChapter = chapters[chapterKeys[currentIndex]];

          mapRef.current.flyTo({
            ...targetChapter,
            duration: 2000,
            essential: true
          });

          mapRef.current.once('moveend', () => {
            if (alarmVisibleRef.current) {
              playNextStep();
            }
          });
        };

        // Start the chain
        playNextStep();
      }
    });

    return () => {
      mapRef.current.remove()
    }
  }, []) // Re-run only on mount (or if we wanted to change ID, but keeping empty is fine)

  // Interaction Blocking Logic & Flashlight Tracking
  const [isInteractionBlocked, setInteractionBlocked] = useState(false);
  const isInteractionBlockedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const hoveredFeatures = useRef(new Set());

  useEffect(() => {
    isInteractionBlockedRef.current = isInteractionBlocked;
  }, [isInteractionBlocked]);

  // Handle Drag Pan
  useEffect(() => {
    if (!mapRef.current) return;

    // If a drag is already active, do not block interactions.
    // This allows the user to drag *over* blocked elements if they started outside.
    if (isDraggingRef.current) return;

    if (isInteractionBlocked) {
      mapRef.current.dragPan.disable();
    } else {
      mapRef.current.dragPan.enable();
    }
  }, [isInteractionBlocked]);

  // Track dragging state to prevent blocking mid-drag
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const onDragStart = () => { isDraggingRef.current = true; };
    const onDragEnd = () => {
      isDraggingRef.current = false;

      // Re-evaluate blocking state on drag end
      // If we end a drag WHILE over a blocked element, we must now block.
      if (isInteractionBlockedRef.current) {
        map.dragPan.disable();
      }
    };

    map.on('dragstart', onDragStart);
    map.on('dragend', onDragEnd);

    return () => {
      map.off('dragstart', onDragStart);
      map.off('dragend', onDragEnd);
    };
  }, []);

  // Handle Flashlight Mouse Move
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;


    const handleFlashlight = (e) => {
      if (isInteractionBlockedRef.current) {
        hoveredFeatures.current.forEach(f => {
          map.setFeatureState({ source: f.source, sourceLayer: f.sourceLayer, id: f.id }, { hover: false });
        });
        hoveredFeatures.current.clear();
        return;
      }

      const radius = 100; // Radius in pixels
      const bbox = [
        [e.point.x - radius, e.point.y - radius],
        [e.point.x + radius, e.point.y + radius]
      ];

      const layersToQuery = ['poi-label', 'transit-label', 'road-label', 'road-number-shield', 'road-exit-shield'].filter(layer => map.getLayer(layer));
      if (layersToQuery.length === 0) return;

      const features = map.queryRenderedFeatures(bbox, { layers: layersToQuery });

      const currentFeaturesMap = new Map();

      features.forEach(f => {
        if (f.id !== undefined) {
          const key = `${f.source}|${f.sourceLayer}|${f.id}`;
          currentFeaturesMap.set(key, { source: f.source, sourceLayer: f.sourceLayer, id: f.id });
          map.setFeatureState({ source: f.source, sourceLayer: f.sourceLayer, id: f.id }, { hover: true });
        }
      });

      // Remove old ones
      hoveredFeatures.current.forEach((obj, key) => {
        if (!currentFeaturesMap.has(key)) {
          map.setFeatureState({ source: obj.source, sourceLayer: obj.sourceLayer, id: obj.id }, { hover: false });
        }
      });

      hoveredFeatures.current = currentFeaturesMap;
    };

    map.on('mousemove', handleFlashlight);

    return () => {
      if (map) map.off('mousemove', handleFlashlight);
    };
  }, []);

  const handleChapterChange = useCallback((chapterName) => {
    if (showAlarm) return;

    // Direct FlyTo (Remote Style) - No observer needed
    const chapter = chapters[chapterName];
    if (chapter && mapRef.current) {
      mapRef.current.flyTo({
        ...chapter,
        essential: true,
      });

      // Preload next chapter
      const chapterKeys = Object.keys(chapters);
      const currentIndex = chapterKeys.indexOf(chapterName);
      const nextChapterName = chapterKeys[currentIndex + 1];
      if (nextChapterName) {
        const nextChapter = chapters[nextChapterName];
        preloadChapter(mapRef.current, nextChapter);
      }
    }
  }, [showAlarm]);

  return (
    <>
      {showAlarm && <AlarmScreen onDismiss={handleAlarmDismiss} />}

      <MapInteractionContext.Provider value={{ isInteractionBlocked, setInteractionBlocked }}>
        {import.meta.env.DEV && <DevCameraHUD map={mapInstance} />}
        {/* Map Container */}
        <div className='map-container' ref={mapContainerRef} style={{ position: 'fixed', top: 0, bottom: 0, width: '100%', zIndex: 0 }} />

        {/* Wrapper */}
        <div className={!showAlarm ? "content-container" : ""} style={{ position: 'relative', zIndex: 1, width: '100%', pointerEvents: 'none' }}>
          <div style={{ position: 'relative', width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <PrologueSection transparent={!showAlarm} />
            {/* Pass handleChapterChange to Content */}
            {!showAlarm && <Content onChapterChange={handleChapterChange} />}
          </div>
        </div>
      </MapInteractionContext.Provider >
    </>
  )
}

export default App
