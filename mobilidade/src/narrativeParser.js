export function parseNarrative(text) {
    if (!text) return [];

    const lines = text.split(/\r?\n/);
    const items = [];
    let buffer = [];
    let pendingCard = null;

    const flushText = () => {
        if (buffer.length === 0) return;
        const fullText = buffer.join('\n').trim();
        if (!fullText) {
            buffer = [];
            return;
        }

        if (pendingCard) {
            let content = fullText;
            let title = null;
            const titleMatch = content.match(/^\[(\d{1,2}:\d{2})\]/);
            if (titleMatch) {
                title = titleMatch[1];
                content = content.replace(/^\[(\d{1,2}:\d{2})\]\s*/, '');
            }

            items.push({
                ...pendingCard,
                title,
                text: content
            });
            pendingCard = null;
        } else {
            items.push({
                type: 'text',
                id: `text-${Math.random().toString(36).substr(2, 9)}`,
                text: fullText
            });
        }
        buffer = [];
    };

    let i = 0;
    while (i < lines.length) {
        let line = lines[i];
        const trimmed = line.trim();

        // 0. BLANK LINE CHECK
        if (!trimmed) {
            // If we are inside a card capture, a double newline (blank line) ends the card
            if (pendingCard && buffer.length > 0) {
                flushText();
            } else {
                buffer.push(line);
            }
            i++;
            continue;
        }

        // 1. COMPONENT
        // Matches [component:name] or [component:name](...
        const compMatch = trimmed.match(/^\[component:\s*([\w-]+)\](.*)/i);
        if (compMatch) {
            flushText();
            const componentName = compMatch[1];
            let remainder = compMatch[2] ? compMatch[2].trim() : '';

            let contentLines = [];
            let argsFound = false;

            // CASE A: Starts on same line?
            if (remainder.startsWith('(')) {
                argsFound = true;
                if (remainder.endsWith(')') && remainder.length > 1) {
                    // Single line case: [comp](args)
                    // Be careful not to match [comp](start ... )end
                    // For now assume if it ends with ) on same line, it's single line unless it looks clearly multi-line (not supported mixed yet)
                    // We'll strip start and end and take it.
                    contentLines.push(remainder.slice(1, -1));
                    i++;
                } else {
                    // Multi-line starting here: [comp](
                    // Push content after (
                    let startContent = remainder.substring(1);
                    if (startContent) contentLines.push(startContent);

                    i++;
                    // Capture until )
                    while (i < lines.length) {
                        const l = lines[i];
                        if (l.trim() === ')') {
                            i++;
                            break;
                        }
                        contentLines.push(l);
                        i++;
                    }
                }
            }
            // CASE B: Starts on next line?
            else if (!remainder) {
                // Peek
                let nextI = i + 1;
                while (nextI < lines.length && !lines[nextI].trim()) {
                    nextI++;
                }

                if (nextI < lines.length && lines[nextI].trim().startsWith('(')) {
                    // Found it
                    i = nextI;
                    let currentLine = lines[i].trim();
                    argsFound = true;

                    // If exactly "(", just consume
                    if (currentLine === '(') {
                        i++;
                        while (i < lines.length) {
                            const l = lines[i];
                            if (l.trim() === ')') {
                                i++;
                                break;
                            }
                            contentLines.push(l);
                            i++;
                        }
                    } else {
                        // "( content"
                        // Handle like Case A
                        let startContent = lines[i].trim().substring(1); // naive trim then substring
                        // If we want to preserve indentation of content, we should use lines[i] but find index of (
                        // Simplification: assume user writes "(" on its own line usually, or "(text"
                        if (currentLine.endsWith(')')) {
                            contentLines.push(currentLine.slice(1, -1));
                            i++;
                        } else {
                            if (startContent) contentLines.push(startContent);
                            i++;
                            while (i < lines.length) {
                                const l = lines[i];
                                if (l.trim() === ')') {
                                    i++;
                                    break;
                                }
                                contentLines.push(l);
                                i++;
                            }
                        }
                    }
                } else {
                    // No args
                    i++;
                }
            } else {
                // Remainder exists but not starting with ( -> garbage or ignored
                i++;
            }

            // Process Content
            let finalContent = [];
            if (argsFound) {
                const fullStr = contentLines.join('\n');
                // Split by double newline to match "each paragraph is a section"
                finalContent = fullStr.split(/\n\s*\n/).filter(s => s.trim());
            }

            items.push({
                type: 'component',
                id: `component-${Math.random().toString(36).substr(2, 9)}`,
                componentName: componentName,
                content: finalContent
            });
            continue;
        }

        // 2. CARD
        const cardMatch = trimmed.match(/^\[card(?::\s*([\w-]+))?\]/i);
        if (cardMatch) {
            flushText();
            let specifiedId = cardMatch[1];
            const id = specifiedId || `generated-card-${Math.random().toString(36).substr(2, 9)}`;

            pendingCard = {
                type: 'card',
                id: id,
                align: 'right'
            };
            i++;
            continue;
        }

        // 3. TITLE/HEADER
        if (trimmed.startsWith('#')) {
            flushText();
            const level = trimmed.startsWith('##') ? 2 : 1;
            items.push({
                type: 'title',
                level,
                id: `title-${Math.random().toString(36).substr(2, 9)}`,
                text: trimmed.replace(/^#+\s*/, '')
            });
            i++;
            continue;
        }

        // 4. IMAGE
        // Matches @[path]
        const imageMatch = trimmed.match(/^@\[(.*?)\]/);
        if (imageMatch) {
            flushText();
            items.push({
                type: 'image',
                id: `image-${Math.random().toString(36).substr(2, 9)}`,
                src: imageMatch[1].trim()
            });
            i++;
            continue;
        }

        // 5. TEXT
        buffer.push(line);
        i++;
    }

    flushText();

    // Alternate Card Alignment
    let cardCount = 0;
    items.forEach(item => {
        if (item.type === 'card') {
            item.align = cardCount % 2 === 0 ? 'right' : 'left';
            cardCount++;
        }
    });

    return items;
}
