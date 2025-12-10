import { createContext, useContext, useState } from 'react';

export const MapInteractionContext = createContext({
    isInteractionBlocked: false,
    setInteractionBlocked: () => { }
});

export const useMapInteraction = () => useContext(MapInteractionContext);

export const MapInteractionProvider = ({ children }) => {
    const [isInteractionBlocked, setInteractionBlocked] = useState(false);

    return (
        <MapInteractionContext.Provider value={{ isInteractionBlocked, setInteractionBlocked }}>
            {children}
        </MapInteractionContext.Provider>
    );
};

export default MapInteractionContext;
