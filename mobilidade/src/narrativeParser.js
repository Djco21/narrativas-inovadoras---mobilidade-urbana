export function parseNarrative(text) {
    if (!text) return [];

    // Split by double newlines to separate blocks
    const rawBlocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(b => b);

    const items = [];
    let cardCount = 0;
    let currentTextBlock = [];

    // Helper to flush current text block if it exists
    const flushTextBlock = () => {
        if (currentTextBlock.length > 0) {
            items.push({
                type: 'text',
                id: `text-${Math.random().toString(36).substr(2, 9)}`,
                text: currentTextBlock.join('\n\n') // Join paragraphs with double newline
            });
            currentTextBlock = [];
        }
    };

    rawBlocks.forEach((block) => {
        // Check for ## Subtitle syntax (Level 2)
        if (block.startsWith('##')) {
            flushTextBlock();
            items.push({
                type: 'title',
                level: 2,
                id: `subtitle-${Math.random().toString(36).substr(2, 9)}`,
                text: block.replace(/^##+\s*/, '')
            });
            return;
        }


        // Check for # Title syntax (Level 1)
        if (block.startsWith('#')) {
            flushTextBlock();
            items.push({
                type: 'title',
                level: 1,
                id: `title-${Math.random().toString(36).substr(2, 9)}`,
                text: block.replace(/^#+\s*/, '')
            });
            return;
        }

        // Check for [component] syntax
        const componentMatch = block.match(/^\[component:\s*([\w-]+)\]/i);
        if (componentMatch) {
            flushTextBlock();
            const componentName = componentMatch[1];
            items.push({
                type: 'component',
                id: `component-${Math.random().toString(36).substr(2, 9)}`,
                componentName: componentName,
                content: block.replace(/^\[component:\s*[\w-]+\]\s*/i, '').trim() // Optional content if any
            });
            return;
        }

        // Check for [card] syntax
        const cardMatch = block.match(/^\[card(?::\s*([\w-]+))?\]/i);

        if (cardMatch) {
            // We found a card, so first finish any pending text block
            flushTextBlock();

            // Process the card
            let content = block.replace(/^\[card(?::\s*[\w-]+)?\]\s*/i, '').trim();
            const specifiedId = cardMatch[1];
            const id = specifiedId || `generated-card-${cardCount}`;

            let title = null;
            const titleMatch = content.match(/^\[(\d{1,2}:\d{2})\]/);
            if (titleMatch) {
                title = titleMatch[1];
                content = content.replace(/^\[(\d{1,2}:\d{2})\]\s*/, '');
            }

            const align = cardCount % 2 === 0 ? 'right' : 'left';
            cardCount++;

            items.push({
                type: 'card',
                id,
                title,
                text: content,
                align
            });
        } else {
            // It's a text paragraph, add to current text block buffer
            currentTextBlock.push(block);
        }
    });

    // Flush any remaining text at the end
    flushTextBlock();

    return items;
}
