import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion';
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


preloadChapter('est-camaragibe');

const chapters = {
  'est-camaragibe': {
    center: [-34.9951367, -8.0248778],
    zoom: 16,
    pitch: 0,
    bearing: 0
  },
  'est-camaragibe-2': {
    center: [-34.9951367, -8.0248778],
    zoom: 12,
    pitch: 0,
    bearing: 0
  },
  'est-recife': {
    center: [-34.8858867, -8.0691144],
    zoom: 16,
    pitch: 0,
    bearing: 0
  },
  'novotel': {
    center: [-34.8753267, -8.0695504],
    zoom: 16,
    pitch: 0,
    bearing: 0
  },
  'recife': {
    center: [-34.8959673, -8.0760724],
    zoom: 12,
    pitch: 0,
    bearing: 0
  },
  'camaragibe-recife': {
    center: [-34.95, -8.08],
    zoom: 13,
    pitch: 60,
    bearing: -300
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

  // State to track map position (optional)
  const [center, setCenter] = useState([-34.9951367, -8.0248778])
  const [zoom, setZoom] = useState(15.12)

  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZGpjbzIxIiwiYSI6ImNtaXA3cDBlejBhaW0zZG9sbXZpOHFhYnQifQ.Bo43glKkuVwj310Z-L58oQ'

    // Backward Tour: Start at the END (camaragibe-recife) if alarm is shown
    const initialView = showAlarm ? chapters['camaragibe-recife'] : chapters['est-camaragibe'];

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialView.center,
      zoom: initialView.zoom,
      pitch: initialView.pitch,
      bearing: initialView.bearing,
    });

    // Disable scroll zoom
    mapRef.current.scrollZoom.disable();

    // Update state on move
    mapRef.current.on('move', () => {
      const mapCenter = mapRef.current.getCenter();
      const mapZoom = mapRef.current.getZoom();
      setCenter([mapCenter.lng, mapCenter.lat]);
      setZoom(mapZoom);
    });

    mapRef.current.on('load', () => {

      // Add Extra Route (Part 5) - Blue
      mapRef.current.addSource('extra-route', {
        type: 'geojson',
        data: extraRouteData
      });

      mapRef.current.addLayer({
        id: 'extra-route',
        type: 'line',
        source: 'extra-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#003399', // Blue
          'line-width': 4,
          'line-opacity': 0.8
        }
      });

      mapRef.current.addSource('route', {
        type: 'geojson',
        data: routeData
      });

      mapRef.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#e77405', // Use the orange from OSM tags or similar
          'line-width': 4,
          'line-opacity': 0.8
        }
      });

      // 3D BUILDINGS (From Remote)
      const layers = mapRef.current.getStyle().layers;
      const labelLayerId = layers.find(
        (layer) => layer.type === 'symbol' && layer.layout['text-field']
      ).id;

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
            'fill-extrusion-color': '#CECECE',
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

  const handleChapterChange = (chapterName) => {
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
  };

  return (
    <>
      {showAlarm && <AlarmScreen onDismiss={handleAlarmDismiss} />}

      <MapInteractionContext.Provider value={{ isInteractionBlocked, setInteractionBlocked }}>
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
