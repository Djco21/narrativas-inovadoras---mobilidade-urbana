export const theme = {
    colors: {
        background: {
            prologue: '#000000',
            title: '#00000000',
            // narrative: 'transparent' // Managed by Content.jsx overlay now
        },
        narrative: {
            text: '#FFFFFF',
            title: '#FFFFFF', // Default title color
            bold: '#FF0000',
            italic: '#AAAAAA',
            cardBackground: '#222222DD',
            cardText: '#FFFFFF',
            cardBorder: 'transparent',
            conclusionBold: '#FFFFFF' // Special bold color for conclusion (Credits, etc.)
        },
        transport: {
            busLine: '#9d00ff',
            metroLine: '#e70505',
            busLineBack: '#009000',
            lineLeft: '#003399',
            lineRight: '#FF9900', // SVG Decoration Color
            buildings: '#333333',
            stations: {
                fill: '#333333',
                stroke: '#FFFFFF'
            }
        }
    },
    map: {
        style: 'mapbox://styles/mapbox/dark-v11',
        defaults: {
            zoom: 16,
            pitch: 0,
            bearing: 0
        },
        layers: {
            lineWidth: 4,
            extrusionHeight: 5
        },
        camera: {
            'camera-projection': 'orthographic'
        }
    }
};
