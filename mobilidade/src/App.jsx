import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'

import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css'

const INITIAL_CENTER = [
-74.0242,
40.6941
]
const INITIAL_ZOOM = 10.12

function App() {
const mapRef = useRef()
const mapContainerRef = useRef()

const [center, setCenter] = useState(INITIAL_CENTER)
const [zoom, setZoom] = useState(INITIAL_ZOOM)

  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZGpjbzIxIiwiYSI6ImNtaXA3cDBlejBhaW0zZG9sbXZpOHFhYnQifQ.Bo43glKkuVwj310Z-L58oQ'
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: [-34.8717381, -8.0632174],
      zoom: 15.12
    });

    mapRef.current.scrollZoom.disable()
useEffect(() => {
  mapboxgl.accessToken = 'pk.eyJ1IjoiZGpjbzIxIiwiYSI6ImNtaXA3cDBlejBhaW0zZG9sbXZpOHFhYnQifQ.Bo43glKkuVwj310Z-L58oQ'
  mapRef.current = new mapboxgl.Map({
    container: mapContainerRef.current,
    center: center,
    zoom: zoom
  });

  mapRef.current.on('move', () => {
    // get the current center coordinates and zoom level from the map
    const mapCenter = mapRef.current.getCenter()
    const mapZoom = mapRef.current.getZoom()

    // update state
    setCenter([ mapCenter.lng, mapCenter.lat ])
    setZoom(mapZoom)
  })

  return () => {
    mapRef.current.remove()
  }
}, [])

const handleButtonClick = () => {
  mapRef.current.flyTo({
    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM
  })
}


  return (
    <>
      <div id='map-container' ref={mapContainerRef} />
    </>
  )
}

export default App
