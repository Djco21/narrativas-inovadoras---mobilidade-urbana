export const storyConfig = {
    'start': {
        camera: {
            "center": [
                -34.9952,
                -8.024595
            ],
            "zoom": 16,
            "pitch": 69.6,
            "bearing": 103.16
        },
        triggers: ['card-camaragibe-recife']
    },
    'recife': {
        camera: {
            center: [-34.8959673, -8.0760724],
            zoom: 11,
            pitch: 45,
            bearing: 0
        },
        triggers: ['card-camaragibe-recife']
    },
    'est-camaragibe': {
        camera: {
            center: [-34.992555, -8.024181],
            zoom: 16,
            pitch: 71.6,
            bearing: 104.76
        },
        triggers: ['card-camaragibe'],
    },
    'camaragibe-recife': {
        camera: {
            center: [-34.938408, -8.077322],
            zoom: 12,
            pitch: 0,
            bearing: 45.82
        },
        triggers: ['card-percurso']
    },
    'est-recife': {
        camera: {
            center: [-34.879366, -8.067496],
            zoom: 15,
            pitch: 58.95,
            bearing: 66.24
        },
        triggers: ['card-recife']
    },
    'novotel': {
        camera: {
            center: [-34.875888, -8.070171],
            zoom: 16,
            pitch: 66.79,
            bearing: 12.79
        },
        triggers: ['card-etapa-final', 'card-volta-start']
    },
    'derby': {
        camera: {
            center: [-34.896803, -8.061814],
            zoom: 14,
            pitch: 0,
            bearing: 0
        },
        triggers: ['card-cais-derby']
    },
    'derby-camaragibe': {
        camera: {
            "center": [
                -34.959173,
                -8.059377
            ],
            "zoom": 12,
            "pitch": 0,
            "bearing": 0
        },
        triggers: ['card-derby-camaragibe', 'conclusao-dormir']
    },
    'conde-boa-vista': {
        camera: {
            center: [-34.927097, -8.067998],
            zoom: 12,
            pitch: 10.5,
            bearing: 50.73
        },
        triggers: ['ida-ubermoto', 'moto-acidentes']
    },
    'camaragibe': {
        camera: {
            center: [-34.986082, -8.019862],
            zoom: 13.5,
            pitch: 45.54,
            bearing: 13.02
        },
        triggers: ['inicio-bike', 'conclusao-banho']
    },
    'volta-boa-vista': {
        camera: {
            center: [-34.924663, -8.044621],
            zoom: 12.5,
            pitch: 52.54,
            bearing: -69.29
        },
        triggers: ['volta-casa']
    }

};

/**
 * Helper to generate the legacy narrativeMappings object (CardID -> ChapterID)
 */
export const getNarrativeMappings = () => {
    const mappings = {};
    Object.entries(storyConfig).forEach(([chapterId, config]) => {
        if (config.triggers) {
            config.triggers.forEach(cardId => {
                mappings[cardId] = chapterId;
            });
        }
    });
    return mappings;
};

/**
 * Helper to get the chapters object expected by App.jsx (ChapterID -> CameraOptions)
 */
export const getChapters = () => {
    const chapters = {};
    Object.entries(storyConfig).forEach(([chapterId, config]) => {
        chapters[chapterId] = config.camera;
    });
    return chapters;
};

// Route Triggers Configuration (CardID -> RouteVisibility)
export const routeTriggers = {
    'card-camaragibe-recife': {
        route: false,
        extraRoute: false,
        novotel: false,
        part7: false,
        part8: false
    },
    'card-camaragibe': {
        route: false,
        extraRoute: false,
        novotel: false,
        part7: false,
        part8: false
    },
    'card-percurso': {
        route: true,
        extraRoute: false,
        novotel: false,
        part7: false,
        part8: false
    },
    'card-recife': {
        extraRoute: true,
        route: true,
        novotel: false,
        part7: false,
        part8: false
    },
    'card-cais-derby': {
        novotel: true,
        extraRoute: true,
        route: true,
        part7: false,
        part8: false
    },
    'card-derby-camaragibe': {
        part7: true,
        extraRoute: true,
        route: true,
        novotel: true,
        part8: false
    },
    'ida-ubermoto': {
        part8: true,
        part7: false,
        novotel: false,
        extraRoute: false,
        route: false
    },
    'conclusao-dormir': {
        part8: true,
        part7: true,
        novotel: true,
        extraRoute: true,
        route: true
    }
};
