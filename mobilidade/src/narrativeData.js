import { parseNarrative } from './narrativeParser';
import { getNarrativeMappings } from './storyConfig';
import localNarrative from './narrative.md?raw';

// Common Processor
const processNarrative = (text) => {
    const parsedItems = parseNarrative(text);
    const narrativeMappings = getNarrativeMappings();

    return {
        items: parsedItems.map(item => {
            if (item.type === 'card' && narrativeMappings[item.id]) {
                item.triggerAfter = narrativeMappings[item.id];
            }
            return item;
        })
    };
};

// Static / Cache Loader
export function getStaticNarrative() {
    return processNarrative(localNarrative);
}

// Fetch and Parse
export async function fetchNarrativeData() {
    try {
        // Cache-busting: ?t=timestamp
        const response = await fetch(`/api/narrative?t=${Date.now()}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch narrative: ${response.statusText}`);
        }
        const text = await response.text();
        return processNarrative(text);
    } catch (error) {
        console.error("Error loading narrative:", error);
        // Fallback to static on error
        return getStaticNarrative();
    }
}

