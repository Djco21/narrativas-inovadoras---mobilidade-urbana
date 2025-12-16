export function parseNarrative(text) {
    if (!text) return [];

    const lines = text.split(/\r?\n/);
    const items = [];

    // State
    let currentItem = null; // { type, componentName?, content: [] }
    let buffer = [];

    // Helper: Flush buffer as a content paragraph (argument)
    const flushBuffer = () => {
        if (buffer.length === 0) return;
        const paragraph = buffer.join('\n').trim();
        if (paragraph && currentItem) {
            currentItem.content.push(paragraph);
        } else if (paragraph) {
            // Text outside of any component?
            // User implies "add a text tag".
            // If we find text before any tag, maybe treat as 'text' type automatically? or dropped?
            // To be safe, let's auto-create a text item if none exists, or just warn.
            // Let's create a generic text item.
            if (!currentItem) {
                currentItem = {
                    type: 'text',
                    id: `text-${Math.random().toString(36).substr(2, 9)}`,
                    content: [paragraph]
                };
                items.push(currentItem);
                // Note: we pushed it, but we keep currentItem active to append more paras
                // actually, if we hit a new tag, we switch currentItem.
            }
        }
        buffer = [];
    };

    // Helper: Finalize current item and push to items list
    // (Actually we push reference immediately or at end? Better at end of logic block)
    // Strategy: We keep currentItem in valid state. When switching, we don't need to "push" if we pushed it on creation.
    // Let's use "Pending" strategy: accumulate, then push when switching.
    const finalizeItem = () => {
        flushBuffer();
        if (currentItem) {
            // Post-processing for specific types
            if (currentItem.type === 'card_dsl') {
                // Map content to card schema: { type: 'card', title?, text }
                // User said: "card component that takes an argument list with a single element"
                // But existing cards have Time + Text.
                // Let's assume:
                // Arg 1: Time (title)
                // Arg 2: Text (text) OR Arg 1 contains both?
                // Let's assume Arg 1 = Time, Arg 2... = Text.
                // Or if only 1 arg, maybe just Text?
                // Let's look at usage: "card: card-camaragibe \n [05:00] \n Text"
                // [05:00] is typically a separate para in MD if written on new line.

                const timeStr = currentItem.content.length > 0 ? currentItem.content[0] : '';
                // Check if first arg looks like time [00:00]
                const timeMatch = timeStr.match(/^\\?\[?(\d{1,2}:\d{2})\\?\]?/);

                let title = null;
                let bodyText = '';

                if (timeMatch) {
                    title = timeMatch[1];
                    // Strip the timestamp from the first line to get potential lead-in text
                    const firstLineRemainder = timeStr.replace(timeMatch[0], '').trim();

                    const restOfBody = currentItem.content.slice(1);
                    if (firstLineRemainder) {
                        bodyText = [firstLineRemainder, ...restOfBody].join('\n\n');
                    } else {
                        bodyText = restOfBody.join('\n\n');
                    }
                } else {
                    bodyText = currentItem.content.join('\n\n');
                }

                // If it's pure text, treat as body. Use componentName as ID if provided in tag?
                // Tag: ### card: id
                // name = "card: id" -> logic below will split ID.

                items.push({
                    type: 'card',
                    id: currentItem.id || `card-${Math.random().toString(36).substr(2, 9)}`,
                    align: 'right', // Will be fixed by alternation pass
                    title: title,
                    text: bodyText
                });
            }
            else if (currentItem.type === 'text_dsl') {
                // ### text
                items.push({
                    type: 'text',
                    id: `text-${Math.random().toString(36).substr(2, 9)}`,
                    // Pass raw content array (paragraphs/arguments) directly
                    content: currentItem.content
                });
            }
            else if (currentItem.type === 'component') {
                // ### name
                items.push({
                    type: 'component',
                    id: `comp-${Math.random().toString(36).substr(2, 9)}`,
                    componentName: currentItem.componentName,
                    content: currentItem.content // List of strings
                });
            }
            // If type was 'text' (implicit), it's already pushed?
            // Actually, implicit text strategy above used 'text' type.
            // Let's unify.
        }
        currentItem = null;
    };


    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let trimmed = line.trim();

        // 1. BLANK LINE -> Flush Paragraph
        if (!trimmed) {
            flushBuffer();
            continue;
        }

        // 2. HEADER 3 (###) -> New Component
        if (trimmed.startsWith('###')) {
            finalizeItem(); // Close previous

            // Format: "### Name" or "### Name: ID" or "### Name (Args)?" (Args removed per DSL)
            // Just "### Name" where Name can encompass "card: id" possibly?
            // "remove component: from the tag" -> "### prequel"
            // "create card component..." -> "### card" 
            // "reomove parenthesis entirely"

            let rawName = trimmed.replace(/^###\s*/, '').trim();
            // Check for ID separation "card: id"
            // Or just generic "Name"

            // Logic:
            // if starts with "card" -> type=card_dsl
            // if starts with "text" -> type=text_dsl
            // else -> type=component

            // Handling "card: my-id"
            let type = 'component';
            let componentName = rawName;
            let id = null;

            // Check specific types
            if (rawName.toLowerCase().startsWith('card')) {
                type = 'card_dsl';
                // extract ID if "card: id"
                const parts = rawName.split(':');
                if (parts.length > 1) {
                    id = parts[1].trim();
                }
            } else if (rawName.toLowerCase().startsWith('text')) {
                type = 'text_dsl';
            } else {
                componentName = rawName.split(':')[0].trim(); // Remove : if present?
                // User said "remove component: from the tag".
                // Did they mean "### component:name" becomes "### name"? Yes.
                // But some components might use arguments in name? No, paragraphs are args.
            }

            currentItem = {
                type,
                componentName,
                id,
                content: []
            };
            continue;
        }

        // 3. HEADER 1/2 (Title) -> Treat as Standard Title Item (Not Component DSL)
        // Rule: If we are inside a generic component (not text/card), we consume headers as args.
        // This allows logic like Prologue parsing its own ## Title.
        if (trimmed.startsWith('#') && !trimmed.startsWith('###')) {
            if (currentItem && currentItem.type === 'component') {
                // Consume as content content
                buffer.push(line);
                continue;
            }

            finalizeItem();
            const level = trimmed.startsWith('##') ? 2 : 1;
            items.push({
                type: 'title',
                level,
                id: `title-${Math.random().toString(36).substr(2, 9)}`,
                text: trimmed.replace(/^#+\s*/, '')
            });
            continue;
        }

        // 4. IMAGE (Legacy @[path]) -> Keep support? 
        // User didn't imply removing images.
        const imageMatch = trimmed.match(/^@\\?\[(.*?)\\?\]/);
        if (imageMatch) {
            finalizeItem(); // Image is standalone item usually?
            // Or should image be content of text? existing parser made it standalone.
            items.push({
                type: 'image',
                id: `image-${Math.random().toString(36).substr(2, 9)}`,
                src: imageMatch[1].trim()
            });
            continue;
        }

        // 5. TEXT CONTENT
        buffer.push(line);
    }

    finalizeItem(); // Flush last

    // Post-Processing: Card Alignment
    let cardCount = 0;
    items.forEach(item => {
        if (item.type === 'card') {
            item.align = cardCount % 2 === 0 ? 'right' : 'left';
            cardCount++;
        }
    });

    return items;
}
