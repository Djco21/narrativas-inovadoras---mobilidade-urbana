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
import novohotelDerbyData from './assets/osm_elements_part6.json';
import part7Data from './assets/osm_elements_part7.json';
import part8Data from './assets/osm_elements_part8.json';
import { preloadChapter } from './preloadUtils';
import { getChapters, routeTriggers } from './storyConfig';
import AlarmScreen from './AlarmScreen';
import Content from './Content';
import { useRouteAnimation } from './useRouteAnimation';


import DevCameraHUD from './DevCameraHUD';
import { theme } from './theme';


// preloadChapter('est-camaragibe');

// preloadChapter('est-camaragibe');

const chapters = getChapters();

function App() {

  const mapRef = useRef()
  const mapContainerRef = useRef()

  // --- CONFIGURAÇÃO DE VISIBILIDADE DAS ROTAS EXTRAS ---
  // --- CONFIGURAÇÃO DE VISIBILIDADE DAS ROTAS EXTRAS ---
  // Estado inicial das rotas (agora suporta objetos de config)
  const [routeVisibility, setRouteVisibility] = useState({
    route: { visible: false, speed: 1 },
    extraRoute: { visible: false, speed: 1 },
    novotel: { visible: false, speed: 1 },
    part7: { visible: false, speed: 1 },
    part8: { visible: false, speed: 1 }
  });
  // -----------------------------------------------------
  // -----------------------------------------------------

  // Hooks de Animação
  // mapInstance is needed.

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

  // Track map instance for DevHUD
  const [mapInstance, setMapInstance] = useState(null);

  // Animation Hooks - They trigger updates internally on the map sources
  useRouteAnimation(mapInstance, 'route-min', 'route', routeData, routeVisibility.route);
  useRouteAnimation(mapInstance, 'extra-route-min', 'extra-route', extraRouteData, routeVisibility.extraRoute);
  useRouteAnimation(mapInstance, 'novohotel-min', 'novohotel', novohotelDerbyData, routeVisibility.novotel);
  useRouteAnimation(mapInstance, 'part7-min', 'part7', part7Data, routeVisibility.part7);
  useRouteAnimation(mapInstance, 'part8-min', 'part8', part8Data, routeVisibility.part8);


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
      // Initialize with EMPTY data so animation starts from 0
      const emptyGeoJSON = turf.featureCollection([]);

      mapRef.current.addSource('extra-route-min', { type: 'geojson', data: emptyGeoJSON });
      mapRef.current.addSource('novohotel-min', { type: 'geojson', data: emptyGeoJSON });
      mapRef.current.addSource('part7-min', { type: 'geojson', data: emptyGeoJSON });
      mapRef.current.addSource('part8-min', { type: 'geojson', data: emptyGeoJSON });

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

      mapRef.current.addLayer({
        id: 'novohotel-min',
        type: 'line',
        source: 'novohotel-min',
        paint: {
          'line-color': theme.colors.transport.busLineBack,
          'line-width': theme.map.layers.lineWidth,
          'line-opacity': 1
        }
      }, labelLayerId);

      mapRef.current.addLayer({
        id: 'part7-min',
        type: 'line',
        source: 'part7-min',
        paint: {
          'line-color': theme.colors.transport.busLineBack,
          'line-width': theme.map.layers.lineWidth,
          'line-opacity': 1
        }
      }, labelLayerId);

      mapRef.current.addLayer({
        id: 'part8-min',
        type: 'line',
        source: 'part8-min',
        paint: {
          'line-color': theme.colors.transport.busLine,
          'line-width': theme.map.layers.lineWidth,
          'line-opacity': 1
        }
      }, labelLayerId);

      mapRef.current.addSource('route-min', { type: 'geojson', data: emptyGeoJSON });

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

      // 3. Route Extrusions (Highest Priority 3D) - Init with EMPTY
      mapRef.current.addSource('extra-route', { type: 'geojson', data: emptyGeoJSON });
      mapRef.current.addSource('novohotel', { type: 'geojson', data: emptyGeoJSON });
      mapRef.current.addSource('part7', { type: 'geojson', data: emptyGeoJSON });
      mapRef.current.addSource('part8', { type: 'geojson', data: emptyGeoJSON });

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

      mapRef.current.addLayer({
        id: 'novohotel',
        type: 'fill-extrusion',
        source: 'novohotel',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': theme.colors.transport.busLineBack,
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

      mapRef.current.addLayer({
        id: 'part7',
        type: 'fill-extrusion',
        source: 'part7',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': theme.colors.transport.busLineBack,
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

      mapRef.current.addLayer({
        id: 'part8',
        type: 'fill-extrusion',
        source: 'part8',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': theme.colors.transport.busLine,
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

      mapRef.current.addSource('route', { type: 'geojson', data: emptyGeoJSON });

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

      // Initialize label layers to opacity 0 (they will be revealed by scroll-driven animation in Content.jsx)
      const labelLayerIds = ['poi-label', 'transit-label', 'road-label-simple', 'road-label', 'settlement-subdivision-label'];
      labelLayerIds.forEach(layerId => {
        if (mapRef.current.getLayer(layerId)) {
          mapRef.current.setPaintProperty(layerId, 'text-opacity', 0);
          mapRef.current.setPaintProperty(layerId, 'icon-opacity', 0);
        }
      });

      // Expose API to control label opacity from scroll animations in Content.jsx
      window.setLabelsOpacity = (opacity) => {
        if (!mapRef.current) return;
        labelLayerIds.forEach(layerId => {
          if (mapRef.current.getLayer(layerId)) {
            mapRef.current.setPaintProperty(layerId, 'text-opacity', opacity);
            mapRef.current.setPaintProperty(layerId, 'icon-opacity', opacity);
          }
        });
      };

      // Removed setInitialLayerVisibility - useRouteAnimation handles it via hook
    });

    return () => {
      mapRef.current.remove()
    }
  }, []) // Re-run only on mount (or if we wanted to change ID, but keeping empty is fine)

  // Interaction Blocking Logic & Flashlight Tracking
  const [isInteractionBlocked, setInteractionBlocked] = useState(false);

  // Removed useEffect for routeVisibility - handled by hooks now

  const isInteractionBlockedRef = useRef(false);
  const isDraggingRef = useRef(false);

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



  const handleChapterChange = useCallback((chapterName, cardId) => {
    if (showAlarm) return;

    // Update Route Visibility if defined in card triggers
    // This must run even if chapter doesn't change
    console.log('Active Card ID:', cardId);
    if (cardId && routeTriggers[cardId]) {
      console.log('Appplying route trigger:', routeTriggers[cardId]);

      const newTrigger = routeTriggers[cardId];
      // Normalize triggers to object format { visible, speed }
      const normalizedTrigger = {};
      Object.keys(newTrigger).forEach(key => {
        const value = newTrigger[key];
        if (typeof value === 'boolean') {
          normalizedTrigger[key] = { visible: value, speed: 1 };
        } else if (typeof value === 'object') {
          normalizedTrigger[key] = { visible: value.visible, speed: value.speed !== undefined ? value.speed : 1 };
        }
      });

      setRouteVisibility(prev => ({
        ...prev,
        ...normalizedTrigger
      }));
    }

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
            {/* Pass handleChapterChange to Content */}
            <Content onChapterChange={handleChapterChange} />
          </div>
        </div>
      </MapInteractionContext.Provider >
    </>
  )
}

export default App
