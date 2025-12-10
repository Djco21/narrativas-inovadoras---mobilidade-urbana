import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'

import 'mapbox-gl/dist/mapbox-gl.css';

import { motion } from 'framer-motion';

import './App.css'
import GradientStrip from './GradientStrip';
import InteractionBlocker from './InteractionBlocker';
import { MapInteractionContext } from './MapInteractionContext';
import routeData from './assets/route.json';
import extraRouteData from './assets/osm_elements_part5.json';
import SubwayLines from './SubwayLines';
import { preloadChapter } from './preloadUtils';
import AlarmScreen from './AlarmScreen';


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
  }, [showAlarm]);

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

  // State for dynamic subway stops
  const [stops, setStops] = useState({
    blue: ['line-start-blue'],
    orange: ['line-start-orange', 'path-control-1']
  });

  // Effect to automatically detect stations from the DOM
  useEffect(() => {
    // 1. Find all cards
    const leftCards = Array.from(document.querySelectorAll('.card-left'));
    const rightCards = Array.from(document.querySelectorAll('.card-right'));

    // 2. Extract IDs
    const blueStops = ['line-start-blue', ...leftCards.map(el => el.id).filter(id => id)];
    const orangeStops = ['line-start-orange', 'path-control-1', ...rightCards.map(el => el.id).filter(id => id)];

    // 3. Update state
    setStops({
      blue: blueStops,
      orange: orangeStops
    });
  }, []);

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

  // State to track map position (optional, kept from user's attempt)
  const [center, setCenter] = useState([-34.9951367, -8.0248778])
  const [zoom, setZoom] = useState(15.12)

  // Dynamic Background State
  const [overlayOpacity, setOverlayOpacity] = useState(1);
  const [overlayColor, setOverlayColor] = useState('#fff');

  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZGpjbzIxIiwiYSI6ImNtaXA3cDBlejBhaW0zZG9sbXZpOHFhYnQifQ.Bo43glKkuVwj310Z-L58oQ'

    // Reverse Tour: Start at the END (metro-3)
    const initialView = showAlarm ? chapters['camaragibe-recife'] : chapters['est-camaragibe'];

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialView.center,
      zoom: initialView.zoom,
      pitch: initialView.pitch,
      bearing: initialView.bearing,
    });

    // Disable scroll zoom to prevent interference with page scrolling
    mapRef.current.scrollZoom.disable();

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
    });

    // Update state on move (optional feature user seemed to want)
    mapRef.current.on('move', () => {
      const mapCenter = mapRef.current.getCenter();
      const mapZoom = mapRef.current.getZoom();
      setCenter([mapCenter.lng, mapCenter.lat]);
      setZoom(mapZoom);
    });

    // Reverse Tour Logic
    mapRef.current.on('load', () => {
      // Insert the layer beneath the first symbol layer.
      const layers = mapRef.current.getStyle().layers;
      const labelLayerId = layers.find(
        (layer) => layer.type === 'symbol' && layer.layout['text-field']
      ).id;

      // The 'building' layer in the Mapbox Streets vector tileset contains building height data
      // from OpenStreetMap.
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

            // Use an 'interpolate' expression to
            // add a smooth transition effect to
            // the buildings as the user zooms in.
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

      // Initialize Flashlight Effect
      // 1. Configure Layers to be hidden by default but distinct (using feature-state)
      const layersToEffect = ['poi-label', 'transit-label', 'road-label', 'road-number-shield', 'road-exit-shield'];

      layersToEffect.forEach(layerId => {
        if (mapRef.current.getLayer(layerId)) {
          // Set initial opacity to 0 (hidden)
          // We use a case expression: if feature-state.hover is true, opacity 1, else 0
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

          // Add transition for smooth in/out
          mapRef.current.setPaintProperty(layerId, 'text-opacity-transition', { duration: 300, delay: 0 });
          mapRef.current.setPaintProperty(layerId, 'icon-opacity-transition', { duration: 300, delay: 0 });
        }
      });

      if (showAlarm) {
        const chapterKeys = Object.keys(chapters); // ['intro', ..., 'metro-3']
        // We want to go from metro-3 (end) BACK to intro (start)
        // We are already at metro-3. Next target is metro-2.

        let currentIndex = chapterKeys.length - 1;

        const playNextStep = () => {
          // Check live ref to see if user dismissed alarm
          if (!alarmVisibleRef.current) return;

          currentIndex--;
          if (currentIndex < 0) {
            // Reached start (intro), maybe loop or stop? 
            // Logic implies we just stay there or loop. Let's stop.
            return;
          }

          const targetChapter = chapters[chapterKeys[currentIndex]];

          mapRef.current.flyTo({
            ...targetChapter,
            duration: 2000, // Fast jump
            essential: true
          });

          mapRef.current.once('moveend', () => {
            // Only continue if we haven't been interrupted/dismissed
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
  }, [])

  // Interaction Blocking Logic & Flashlight Tracking
  const [isInteractionBlocked, setInteractionBlocked] = useState(false);
  const isInteractionBlockedRef = useRef(false);
  const hoveredFeatures = useRef(new Set());

  // Sync state to ref for event handlers
  useEffect(() => {
    isInteractionBlockedRef.current = isInteractionBlocked;
  }, [isInteractionBlocked]);

  // Handle Drag Pan
  useEffect(() => {
    if (!mapRef.current) return;
    if (isInteractionBlocked) {
      mapRef.current.dragPan.disable();
    } else {
      mapRef.current.dragPan.enable();
    }
  }, [isInteractionBlocked]);

  // Handle Flashlight Mouse Move
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Re-implemented logic for correct Set usage
    const handleFlashlight = (e) => {
      if (isInteractionBlockedRef.current) {
        // Clear all
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

          // Ensure it is 'hovered'
          // Optimization: only set if it wasn't already? Mapbox handles redundant calls well? 
          // Creating a setFeatureState call every move for every feature in radius is okay-ish (10-20 features).
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

    // Cleanup on unmount or map change
    // Using a stable function reference is key or map.off won't work if defined inside.
    // Putting it inside useEffect is fine.

    return () => {
      if (map) map.off('mousemove', handleFlashlight);
    };
  }, []); // Empty dependency array, depends on Ref for blocked state

  // Removed legacy handlers handleMouseEnter/Leave

  // Handlers removed in favor of Context

  const handleChapterChange = (chapterName) => {
    if (showAlarm) return;
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

  const handleBackgroundChange = (opacity, color) => {
    if (opacity !== undefined) setOverlayOpacity(parseFloat(opacity));
    if (color) setOverlayColor(color);
  };

  // Handlers removed in favor of Context

  return (
    <>
      {showAlarm && <AlarmScreen onDismiss={handleAlarmDismiss} />}

      {/* Dynamic Background Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: overlayColor,
          opacity: overlayOpacity, // Default is 1 (White), so it starts white behind Alarm too.
          // Better: just use overlayOpacity. Alarm is z-50. This overlay should be z-0 or z-1.
          // Text content is z-1 (relative). Map is z-0.
          // We need Overlay > Map but Overlay < Text.
          transition: 'opacity 1s ease, background-color 1s ease',
          pointerEvents: 'none',
          zIndex: 0 // Same as map container? Map is usually z-0. We need this ON TOP of map.
        }}
      />

      <MapInteractionContext.Provider value={{ isInteractionBlocked, setInteractionBlocked }}>
        {/* Map Container - Z-Index 0 implicitly (or -1) */}
        <div className='map-container' ref={mapContainerRef} style={{ position: 'fixed', top: 0, bottom: 0, width: '100%', zIndex: -1 }} />
        <div className="content-container" style={{ position: 'relative', zIndex: 1 }}>
          {/* Intro Sequence Wrapper */}
          <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* Gradient Strip covering the whole sequence */}
            {/* Gradient Strip covering the whole sequence */}
            <SubwayLines
              lines={[
                { color: '#FF9900', width: 8, stops: stops.orange }, // Orange Line (Right side mainly)
                { color: '#003399', width: 8, stops: stops.blue }  // Blue Line (Left side mainly)
              ]}
            />

            {/* Ghost Control Point for Orange Line */}
            <div id="path-control-1" style={{ position: 'absolute', top: '70vh', right: '10vw', width: '10px', height: '10px', pointerEvents: 'none' }} />

            {/* <MapInteractionWrapper>
            <GradientStrip
              topEdge="hard"
              bottomEdge="soft"
              height="100%"
              top="0"
              style={{ zIndex: 0, pointerEvents: 'auto' }}
            />
          </MapInteractionWrapper> */}

            {/* === ZONE 1: WHITE BACKGROUND === */}
            <motion.div
              onViewportEnter={() => handleBackgroundChange(1, null)}
              viewport={{ amount: 0.1 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >

              <div
                className="section"
                style={{ zIndex: 1, position: 'relative' }}
              >
                <h1 style={{ fontSize: '4rem', textShadow: '0 0 20px rgba(255,255,255,0.8)' }}>O Preço da Mobilidade</h1>

                {/* Diverging Start Points (Invisible) */}
                <div id="line-start-blue" style={{ position: 'absolute', top: '15vh', left: '35%', height: '10px', width: '10px' }} />
                <div id="line-start-orange" style={{ position: 'absolute', top: '15vh', left: '65%', height: '10px', width: '10px' }} />
              </div>

              {/* Title - Text Only (VIEW: INTRO) */}
              <motion.div
                onViewportEnter={() => handleChapterChange('est-camaragibe')}
                viewport={{ amount: 0.5 }}
                style={{ position: 'absolute', top: '20vh', marginBottom: '10vh', height: '1px', width: '100%', pointerEvents: 'none' }}
              />

              {/* Card 1: Mais um Dia (Left) */}
              <InteractionBlocker>
                <div
                  className="section card-filled card-left"
                  id="station-intro-1"
                  style={{ zIndex: 1, pointerEvents: 'auto' }}
                >
                  <h3>Mais um Dia</h3>
                  <p>São cinco da manhã e o dia ainda nem começou direito, mas o sol, sempre apressado no Recife, já se espalha como se houvesse um para cada habitante da cidade. O corpo sente o peso de ontem, mas a rotina não espera, não pede licença, não pergunta se você está pronto. Apenas segue.</p>
                </div>
              </InteractionBlocker>
            </motion.div>


            {/* === ZONE 2: TRANSPARENT BACKGROUND === */}
            <motion.div
              onViewportEnter={() => handleBackgroundChange(0, null)}
              viewport={{ amount: 0.1 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >

              {/* TRIGGER: INTRO-1 */}
              <motion.div
                onViewportEnter={() => handleChapterChange('est-camaragibe-2')}
                viewport={{ amount: 0.5 }}
                style={{ marginBottom: '10vh', height: '1px', width: '100%', pointerEvents: 'none' }}
              />

              {/* Card 2: Mirelly (Right) */}
              <InteractionBlocker>
                <div
                  className="section card-filled card-right"
                  id="station-intro-2"
                  style={{ zIndex: 1, pointerEvents: 'auto' }}
                >
                  <p>Do mesmo jeito começa, de segunda a sexta, a jornada de Mirelly, jovem aprendiz durante o dia e universitária de Enfermagem à noite, que atravessa a Região Metropolitana para mais um dia. Uma maratona que ninguém escolhe, mas milhões enfrentam.</p>
                </div>
              </InteractionBlocker>

              {/* TRIGGER: INTRO2 */}
              <motion.div
                onViewportEnter={() => handleChapterChange('est-recife')}
                viewport={{ amount: 0.5 }}
                style={{ marginBottom: '10vh', height: '1px', width: '100%', pointerEvents: 'none' }}
              />

              {/* Card 3: Camaragibe (Left) */}
              <InteractionBlocker>
                <div
                  className="section card-filled card-left"
                  id="station-intro-3"
                  style={{ zIndex: 1, pointerEvents: 'auto' }}
                >
                  <p>Moradora de Camaragibe, mais precisamente do bairro de Alberto Maia, “o final de Camaragibe”, como ela mesma costuma dizer, Mirelly desperta às cinco da manhã. Não há luxo de tempo. Ela corre para se arrumar, tomar banho e comer alguma coisa antes de sair. Acordar mais cedo significaria abrir mão de quinze minutinhos daquele sono que, para uma rotina como a dela, vale ouro. Às 5:50, ela tranca a porta e desce a rua rumo à Estação Camaragibe. É o início de mais um dia igual aos outros.</p>
                </div>
              </InteractionBlocker>


              {/* TRIGGER: METRO-1 */}
              <motion.div
                onViewportEnter={() => handleChapterChange('novotel')}
                viewport={{ amount: 0.5 }}
                style={{ marginBottom: '10vh', height: '1px', width: '100%', pointerEvents: 'none' }}
              />

              {/* Card 4: Metro 1 (Right) */}
              <InteractionBlocker>
                <div
                  className="section card-filled card-right"
                  id="station-metro-1"
                  style={{ pointerEvents: 'auto' }}
                >
                  <p>Ela pega o metrô na última estação da Linha Centro às 6h10. Mirelly segue todo o percurso até a Estação Recife, espremida entre mochilas, cotovelos e sonos acumulados. Lá se vão uma hora e dez minutos.</p>
                </div>
              </InteractionBlocker>

              {/* TRIGGER: METRO-2 */}
              <motion.div
                onViewportEnter={() => handleChapterChange('recife')}
                viewport={{ amount: 0.5 }}
                style={{ marginBottom: '10vh', height: '1px', width: '100%', pointerEvents: 'none' }}
              />

              {/* Card 5: Metro 2 (Left) */}
              <InteractionBlocker>
                <div
                  className="section card-filled card-left"
                  id="station-metro-2"
                  style={{ pointerEvents: 'auto' }}
                >
                  <p>De vez em quando, ela tenta olhar pela janela, procurando um fiapo de paisagem por cima das dezenas, às vezes centenas de cabeças que lotam o metrô. Mas a vista quase nunca aparece. O caminho, no entanto, ela já sabe de cor.</p>
                </div>
              </InteractionBlocker>

              {/* TRIGGER: METRO-3 */}
              <motion.div
                onViewportEnter={() => handleChapterChange('camaragibe-recife')}
                viewport={{ amount: 0.5 }}
                style={{ marginBottom: '10vh', height: '1px', width: '100%', pointerEvents: 'none' }}
              />

              {/* Card 6: Metro 3 (Right) */}
              <InteractionBlocker>
                <div
                  className="section card-filled card-right"
                  id="station-metro-3"
                  style={{ pointerEvents: 'auto' }}
                >
                  <p>Segundo o Relatório Global de Transporte Público da Moovit (2024), o recifense passa, em média, 64 minutos dentro do ônibus ou metrô a cada trecho. Tempo que Mirelly já tinha deixado para trás só no primeiro sprint da sua maratona diária pela cidade.</p>
                </div>
              </InteractionBlocker>
            </motion.div>
          </div>
        </div>
      </MapInteractionContext.Provider >
    </>
  )
}

export default App
