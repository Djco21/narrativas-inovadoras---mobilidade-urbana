import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'

import 'mapbox-gl/dist/mapbox-gl.css';

import './App.css'
import GradientStrip from './GradientStrip';
import MapInteractionWrapper from './MapInteractionWrapper';
import SubwayLines from './SubwayLines';

const chapters = {
  'intro': {
    center: [-34.8717381, -8.0632174],
    zoom: 15.12,
    pitch: 0,
    bearing: 0
  },
  'intro-1': {
    center: [-34.8717381, -8.0632174],
    zoom: 15.5,
    pitch: 10,
    bearing: 0
  },
  'intro-2': {
    center: [-34.8717381, -8.0632174],
    zoom: 16,
    pitch: 20,
    bearing: 10
  },
  'intro-3': {
    center: [-34.8717381, -8.0632174],
    zoom: 16.5,
    pitch: 30,
    bearing: -10
  },
  'metro-1': {
    center: [-34.8847, -8.0683], // Estação Recife
    zoom: 14,
    pitch: 45,
    bearing: 15
  },
  'metro-2': {
    center: [-34.8847, -8.0683],
    zoom: 13, // Zoom out slightly
    pitch: 30,
    bearing: 0
  },
  'metro-3': {
    center: [-34.8847, -8.0683],
    zoom: 12, // Zoom out more for context
    pitch: 0,
    bearing: 0
  }
};

function App() {

  const mapRef = useRef()
  const mapContainerRef = useRef()

  // State to track map position (optional, kept from user's attempt)
  const [center, setCenter] = useState([-34.8717381, -8.0632174])
  const [zoom, setZoom] = useState(15.12)

  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZGpjbzIxIiwiYSI6ImNtaXA3cDBlejBhaW0zZG9sbXZpOHFhYnQifQ.Bo43glKkuVwj310Z-L58oQ'
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: chapters['intro'].center,
      zoom: chapters['intro'].zoom,
      pitch: chapters['intro'].pitch,
      bearing: chapters['intro'].bearing,
    });

    // Disable scroll zoom to prevent interference with page scrolling
    mapRef.current.scrollZoom.disable();

    // Update state on move (optional feature user seemed to want)
    mapRef.current.on('move', () => {
      const mapCenter = mapRef.current.getCenter();
      const mapZoom = mapRef.current.getZoom();
      setCenter([mapCenter.lng, mapCenter.lat]);
      setZoom(mapZoom);
    });

    return () => {
      mapRef.current.remove()
    }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const chapterName = entry.target.getAttribute('id');
          const chapter = chapters[chapterName];
          if (chapter && mapRef.current) {
            mapRef.current.flyTo({
              ...chapter,
              essential: true
            });
          }
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('.section').forEach(section => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  // Handlers to disable/enable map pan when hovering over cards
  const handleMouseEnter = () => {
    if (mapRef.current) mapRef.current.dragPan.disable();
  };

  const handleMouseLeave = () => {
    if (mapRef.current) mapRef.current.dragPan.enable();
  };

  return (
    <>
      <div className='map-container' ref={mapContainerRef} />

      <div className="content-container">
        {/* Intro Sequence Wrapper */}
        <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Gradient Strip covering the whole sequence */}
          <SubwayLines
            lines={[
              { color: '#FF9900', width: 8, stops: ['intro', 'path-control-1', 'intro-2', 'metro-1', 'metro-3'] }, // Orange Line (Right side mainly)
              { color: '#003399', width: 8, stops: ['intro', 'intro-1', 'intro-3', 'metro-2'] }  // Blue Line (Left side mainly)
            ]}
          />

          {/* Ghost Control Point for Orange Line */}
          <div id="path-control-1" style={{ position: 'absolute', top: '70vh', right: '10vw', width: '10px', height: '10px', pointerEvents: 'none' }} />

          <MapInteractionWrapper onBlock={handleMouseEnter} onUnblock={handleMouseLeave}>
            <GradientStrip
              topEdge="hard"
              bottomEdge="soft"
              height="100%"
              top="0"
              style={{ zIndex: 0, pointerEvents: 'auto' }}
            />
          </MapInteractionWrapper>

          {/* Title - Text Only */}
          <div
            className="section"
            id="intro"
            style={{ zIndex: 1, marginTop: '20vh', marginBottom: '20vh', pointerEvents: 'none' }} // Reduced margin for title
          >
            <h1 style={{ fontSize: '4rem', textShadow: '0 0 20px rgba(255,255,255,0.8)' }}>O Preço da Mobilidade</h1>
          </div>

          {/* Card 1: Mais um Dia (Left) */}
          <MapInteractionWrapper onBlock={handleMouseEnter} onUnblock={handleMouseLeave}>
            <div
              className="section card-transparent card-left"
              id="intro-1"
              style={{ zIndex: 1 }}
            >
              <h3>Mais um Dia</h3>
              <p>São cinco da manhã e o dia ainda nem começou direito, mas o sol, sempre apressado no Recife, já se espalha como se houvesse um para cada habitante da cidade. O corpo sente o peso de ontem, mas a rotina não espera, não pede licença, não pergunta se você está pronto. Apenas segue.</p>
            </div>
          </MapInteractionWrapper>

          {/* Card 2: Mirelly (Right) */}
          <MapInteractionWrapper onBlock={handleMouseEnter} onUnblock={handleMouseLeave}>
            <div
              className="section card-transparent card-right"
              id="intro-2"
              style={{ zIndex: 1 }}
            >
              <p>Do mesmo jeito começa, de segunda a sexta, a jornada de Mirelly, jovem aprendiz durante o dia e universitária de Enfermagem à noite, que atravessa a Região Metropolitana para mais um dia. Uma maratona que ninguém escolhe, mas milhões enfrentam.</p>
            </div>
          </MapInteractionWrapper>

          {/* Card 3: Camaragibe (Left) */}
          <MapInteractionWrapper onBlock={handleMouseEnter} onUnblock={handleMouseLeave}>
            <div
              className="section card-transparent card-left"
              id="intro-3"
              style={{ zIndex: 1 }}
            >
              <p>Moradora de Camaragibe, mais precisamente do bairro de Alberto Maia, “o final de Camaragibe”, como ela mesma costuma dizer, Mirelly desperta às cinco da manhã. Não há luxo de tempo. Ela corre para se arrumar, tomar banho e comer alguma coisa antes de sair. Acordar mais cedo significaria abrir mão de quinze minutinhos daquele sono que, para uma rotina como a dela, vale ouro. Às 5:50, ela tranca a porta e desce a rua rumo à Estação Camaragibe. É o início de mais um dia igual aos outros.</p>
            </div>
          </MapInteractionWrapper>
        </div>

        {/* Card 4: Metro 1 (Right) */}
        <MapInteractionWrapper onBlock={handleMouseEnter} onUnblock={handleMouseLeave}>
          <div
            className="section card-filled card-right"
            id="metro-1"
          >
            <p>Ela pega o metrô na última estação da Linha Centro às 6h10. Mirelly segue todo o percurso até a Estação Recife, espremida entre mochilas, cotovelos e sonos acumulados. Lá se vão uma hora e dez minutos.</p>
          </div>
        </MapInteractionWrapper>

        {/* Card 5: Metro 2 (Left) */}
        <MapInteractionWrapper onBlock={handleMouseEnter} onUnblock={handleMouseLeave}>
          <div
            className="section card-filled card-left"
            id="metro-2"
          >
            <p>De vez em quando, ela tenta olhar pela janela, procurando um fiapo de paisagem por cima das dezenas, às vezes centenas de cabeças que lotam o metrô. Mas a vista quase nunca aparece. O caminho, no entanto, ela já sabe de cor.</p>
          </div>
        </MapInteractionWrapper>

        {/* Card 6: Metro 3 (Right) */}
        <MapInteractionWrapper onBlock={handleMouseEnter} onUnblock={handleMouseLeave}>
          <div
            className="section card-filled card-right"
            id="metro-3"
          >
            <p>Segundo o Relatório Global de Transporte Público da Moovit (2024), o recifense passa, em média, 64 minutos dentro do ônibus ou metrô a cada trecho. Tempo que Mirelly já tinha deixado para trás só no primeiro sprint da sua maratona diária pela cidade.</p>
          </div>
        </MapInteractionWrapper>
      </div>
    </>
  )
}

export default App
