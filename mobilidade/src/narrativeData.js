import narrativeText from './narrative.md?raw';
import { parseNarrative } from './narrativeParser';
import { getNarrativeMappings } from './storyConfig';

const parsedItems = parseNarrative(narrativeText);
// Generate mappings dynamically from storyConfig
const narrativeMappings = getNarrativeMappings();

export const narrativeData = {
    items: parsedItems.map(item => {
        if (item.type === 'card' && narrativeMappings[item.id]) {
            item.triggerAfter = narrativeMappings[item.id];
        }
        return item;
    })
};
