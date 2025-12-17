import React, { useState, useEffect } from 'react';

const DevCameraHUD = ({ map }) => {
    const [stats, setStats] = useState({
        center: [0, 0],
        zoom: 0,
        pitch: 0,
        bearing: 0
    });
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!map) return;

        const updateStats = () => {
            const center = map.getCenter();
            setStats({
                center: [parseFloat(center.lng.toFixed(6)), parseFloat(center.lat.toFixed(6))],
                zoom: parseFloat(map.getZoom().toFixed(2)),
                pitch: parseFloat(map.getPitch().toFixed(2)),
                bearing: parseFloat(map.getBearing().toFixed(2))
            });
        };

        // Initial update
        updateStats();

        // Attach listeners - ONLY trigger at the end of interactions/animations
        // This effectively pauses updates during 'flyTo' or dragging, eliminating render cost during motion.
        map.on('moveend', updateStats);
        map.on('zoomend', updateStats);
        map.on('pitchend', updateStats);
        map.on('rotateend', updateStats);

        return () => {
            map.off('moveend', updateStats);
            map.off('zoomend', updateStats);
            map.off('pitchend', updateStats);
            map.off('rotateend', updateStats);
        };
    }, [map]);

    const handleCopy = () => {
        const jsonString = JSON.stringify(stats, null, 2);
        navigator.clipboard.writeText(jsonString).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 800);
        });
    };

    return (
        <div
            onClick={handleCopy}
            style={{
                position: 'fixed',
                top: '10px',
                left: '10px',
                zIndex: 9999,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: '#fff',
                fontFamily: 'monospace',
                padding: '10px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '12px',
                pointerEvents: 'auto',
                userSelect: 'none'
            }}
            title="Click to copy as JSON"
        >
            {copied ? (
                <div style={{ color: '#fff', fontStyle: 'italic' }}>copied to clipboard.</div>
            ) : (
                <>
                    <div>center: [{stats.center[0]}, {stats.center[1]}]</div>
                    <div>zoom: {stats.zoom}</div>
                    <div>pitch: {stats.pitch}</div>
                    <div>bearing: {stats.bearing}</div>
                </>
            )}
        </div>
    );
};

export default DevCameraHUD;
