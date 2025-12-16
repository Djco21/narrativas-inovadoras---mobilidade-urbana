import React, { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import SubwayLines from './SubwayLines';
import InteractionBlocker from './InteractionBlocker';
import { fetchNarrativeData, getStaticNarrative } from './narrativeData';

// ... (other imports remain)

// ... (NarrativeDisplay and other components remain)

const Content = ({ onChapterChange, showAlarm }) => {
    // State for narrative items - Initialize with Static Data (Stale-While-Revalidate)
    const [narrativeItems, setNarrativeItems] = useState(() => getStaticNarrative().items);

    // We start as "loaded" because we have the static data.
    // The effect below will background-fetch the new data and update strictly if needed.
    useEffect(() => {
        fetchNarrativeData().then(data => {
            // Optional: You could compare data here to avoid re-renders if identical,
            // but React state updates are cheap enough for this size.
            // A simple JSON.stringify check might save a render.
            // if (JSON.stringify(data.items) !== JSON.stringify(narrativeItems)) ...

            // For now, we just update. The user sees the upgrade "on the fly".
            if (data.items && data.items.length > 0) {
                setNarrativeItems(data.items);
            }
        });
    }, []);

    // Do not render Framer Motion components until Alarm is dismissed
    // REMOVED: if (showAlarm) return null; 
    // We want content (especially Prologue) to render immediately over the map.

    return (
        <NarrativeDisplay
            onChapterChange={onChapterChange}
            narrativeItems={narrativeItems}
        />
    );
};
import { theme } from './theme';
import { componentRegistry } from './componentRegistry';

// Dynamic Asset Loading
const assets = import.meta.glob('./assets/*.{png,jpg,jpeg,svg}', { eager: true });

// Helper to find asset by loose path matching
const findAsset = (path) => {
    if (!path) return null;
    // Extract basename (e.g., "calendario.png" from "foo/bar/calendario.png")
    const basename = path.split(/[/\\]/).pop();

    // Look for a key in assets that ends with this basename
    const foundKey = Object.keys(assets).find(key => key.endsWith(basename));
    return foundKey ? assets[foundKey].default : null;
};

// Simple markdown formatter
const formatText = (text) => {
    if (!text) return null;
    // Replace **bold**
    let formatted = text.replace(/\*\*(.*?)\*\*/g, `<b style="color: ${theme.colors.narrative.bold}">$1</b>`);
    // Replace *italic*
    formatted = formatted.replace(/\*(.*?)\*/g, `<i style="color: ${theme.colors.narrative.italic}">$1</i>`);

    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
};

// Component for narrative main titles
const NarrativeTitle = ({ item, forwardRef }) => {
    const level = item.level || 1;

    // Level 1: Matches Main Title (H1)
    if (level === 1) {
        return (
            <div
                ref={forwardRef}
                className="section title-block"
                style={{
                    zIndex: 1,
                    position: 'relative',
                    width: '100%',
                    maxWidth: '1200px',
                    margin: '4rem auto 2rem',
                    textAlign: 'center',
                    pointerEvents: 'none'
                }}
            >
                <h1 style={{
                    fontSize: '4rem',
                    whiteSpace: 'nowrap',
                    color: theme.colors.narrative.title,
                    // textShadow: '0 0 10px rgba(0,0,0,0.5)' // Optional shadow if needed for contrast
                }}>
                    {item.text}
                </h1>
            </div>
        );
    }

    // Level 2: Subtitle (H2)
    return (
        <div
            ref={forwardRef}
            className="section title-block"
            style={{
                zIndex: 1,
                position: 'relative',
                width: '100%',
                maxWidth: '1200px',
                margin: '3rem auto 1.5rem',
                textAlign: 'center',
                pointerEvents: 'none'
            }}
        >
            <h2 style={{
                fontSize: '2.5rem',
                color: theme.colors.narrative.title,
                textShadow: '0 0 10px rgba(255,255,255,0.8)'
            }}>
                {item.text}
            </h2>
        </div>
    );
};


// Component for standard text blocks
const ProseText = ({ item, forwardRef }) => {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"]
    });

    // Fade in blur acts as "spotlight" on the text
    const blurOpacity = useTransform(scrollYProgress, [0.2, 0.3, 0.7, 0.8], [0, 1, 1, 0]);

    // Use item.content (array) if available, otherwise fallback to splitting item.text
    // This supports the new "Argument List" DSL while maintaining backward compatibility if needed
    const paragraphs = Array.isArray(item.content)
        ? item.content
        : (item.text ? item.text.split(/\n\s*\n/) : []);

    return (
        <>
            {/* Local Scroll-Driven Blur Overlay */}
            <motion.div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backdropFilter: 'blur(16px)',
                    opacity: blurOpacity,
                    pointerEvents: 'none',
                    zIndex: 0
                }}
            />

            <InteractionBlocker>
                <div
                    ref={(el) => {
                        ref.current = el;
                        if (forwardRef) {
                            if (typeof forwardRef === 'function') forwardRef(el);
                            else forwardRef.current = el;
                        }
                    }}
                    className="section prose-text"
                    style={{
                        zIndex: 1,
                        pointerEvents: 'auto',
                        width: '100%',
                        maxWidth: '1200px', // Full width as before
                        margin: '10vh auto',
                        padding: '2rem 10vw',
                        textAlign: 'justify',
                        fontSize: '1.2rem',
                        lineHeight: '1.8',
                        color: theme.colors.narrative.text,
                        background: 'transparent',
                        position: 'relative', // Fix framer-motion warning
                        // textShadow removed as requested
                    }}>
                    {paragraphs.map((para, i) => (
                        <p key={i} style={{ marginBottom: i < paragraphs.length - 1 ? '1em' : 0 }}>
                            {formatText(para)}
                        </p>
                    ))}
                </div>
            </InteractionBlocker>
        </>
    );
}

// Helper to subtract 1 minute from "HH:MM"
const subtractOneMinute = (timeStr) => {
    if (!timeStr || !timeStr.includes(':')) return timeStr;
    const [h, m] = timeStr.split(':').map(Number);
    let newM = m - 1;
    let newH = h;
    if (newM < 0) {
        newM = 59;
        newH = h - 1;
        if (newH < 0) newH = 23;
    }
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
};

const DigitalClock = ({ time, targetRef }) => {
    const [displayTime, setDisplayTime] = useState(subtractOneMinute(time));
    const [isBlinking, setIsBlinking] = useState(false);
    const [isActive, setIsActive] = useState(false);

    // Track scroll progress relative to the viewport bottom
    // "start 100%" -> When top of card hits bottom of viewport (Just entering) -> 0
    // "start 0%" -> When top of card hits top of viewport -> 1
    // We only care about crossing 0.
    const { scrollYProgress } = useScroll({
        target: targetRef,
        offset: ["start center", "start 0%"]
    });

    useEffect(() => {
        return scrollYProgress.on("change", (latest) => {
            const nowActive = latest > 0;

            if (nowActive && !isActive) {
                // Transitioned to Active
                setIsActive(true);
                setDisplayTime(time);
                setIsBlinking(true);
                setTimeout(() => setIsBlinking(false), 3000); // Stop blink after 3s
            } else if (!nowActive && isActive) {
                // Transitioned to Inactive (Backtracked)
                setIsActive(false);
                setDisplayTime(subtractOneMinute(time));
                setIsBlinking(false);
            }
        });
    }, [isActive, scrollYProgress, time]);

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* Ghost Background (88:88) */}
            <h3 style={{
                position: 'absolute',
                top: 0,
                left: 0,
                marginTop: 0,
                marginBottom: '0.5rem',
                color: 'rgba(0, 0, 0, 0.15)', // Light ghost effect
                fontFamily: '"DSEG7-Classic", monospace',
                fontStyle: 'italic',
                fontSize: '1.5rem',
                letterSpacing: '0.05em',
                pointerEvents: 'none',
                zIndex: 0
            }}>
                88:88
            </h3>

            {/* Actual Time */}
            <h3 style={{
                position: 'relative',
                marginTop: 0,
                marginBottom: '0.5rem',
                color: theme.colors.transport.metroLine,
                fontFamily: '"DSEG7-Classic", monospace',
                fontStyle: 'italic',
                fontSize: '1.5rem',
                letterSpacing: '0.05em',
                animation: isBlinking ? 'blink 0.5s step-end infinite' : 'none',
                zIndex: 1
            }}>
                {displayTime}
            </h3>
        </div>
    );
};


// Component for each narrative card with bidirectional scroll triggering
const NarrativeCard = ({ card, index, onChapterChange, forwardRef }) => {
    const cardRef = useRef(null);

    // "margin" creates a viewport trigger zone. 
    // "-50% 0px -50% 0px" means the trigger line is EXACTLY at the center of the viewport.
    const isInView = useInView(cardRef, {
        margin: "-50% 0px -50% 0px",
        amount: "some"
    });

    useEffect(() => {
        if (isInView) {
            console.log(`>>> CARD VIEW: ${card.id} (Trigger: ${card.triggerAfter})`);
            onChapterChange(card.triggerAfter, card.id);
        }
    }, [isInView, card.triggerAfter, onChapterChange, card.id]);

    return (
        <InteractionBlocker>
            <div
                ref={(el) => {
                    cardRef.current = el;
                    if (forwardRef) {
                        if (typeof forwardRef === 'function') forwardRef(el);
                        else forwardRef.current = el;
                    }
                }}
                className={`section card-filled ${card.align === 'right' ? 'card-right' : 'card-left'}`}
                id={card.id}
                style={{
                    position: 'relative', // Fix framer-motion warning
                    zIndex: 1,
                    pointerEvents: 'auto',
                    backgroundColor: theme.colors.narrative.cardBackground,
                    color: theme.colors.narrative.cardText,
                    borderColor: theme.colors.narrative.cardBorder, // Ensure this exists in theme or falls back?
                    // Assuming .card-filled class handles padding/etc, overriding colors here
                }}
            >
                {card.title && <DigitalClock time={card.title} targetRef={cardRef} />}
                {/* Fallback for non-time titles? Assuming cards are timestamps. If not, logic might break subtractOneMinute. 
                    Adding simple check inside DigitalClock (already there).
                */}
                <p>{formatText(card.text)}</p>
            </div>
        </InteractionBlocker>
    );
};

const NarrativeDisplay = ({ onChapterChange, narrativeItems }) => {
    // Dynamic Background State
    // Scroll Interpolation Logic for Prologue -> Title (Black -> White)
    const RMRRef = useRef(null);
    const { scrollYProgress: titleProgress } = useScroll({
        target: RMRRef,
        offset: ["start end", "center center"] // Starts when top of Title hits bottom of Viewport
    });

    const bgOverlayColor = useTransform(titleProgress, [0, 1], [theme.colors.background.prologue, theme.colors.background.title]);

    // Scroll Interpolation Logic for Title -> Narrative (White -> Transparent)
    const { scrollYProgress: narrativeProgress } = useScroll({
        target: RMRRef,
        offset: ["start center", "end center"] // Starts when top of Narrative hits bottom
    });

    // Control the Fade Out of the White Background
    const overlay1Opacity = useTransform(narrativeProgress, [0, 1], [1, 0]);

    // Drive map label opacity from scroll: labels are invisible at title end (narrativeProgress=0)
    // and fully visible by the first card (narrativeProgress=0.06)
    const labelsOpacity = useTransform(narrativeProgress, [0, 0.02, 0.06, 1], [0, 1, 1, 1]);

    useEffect(() => {
        const unsubscribe = labelsOpacity.on('change', (v) => {
            if (window.setLabelsOpacity) {
                const clamped = Math.max(0, Math.min(1, v));
                window.setLabelsOpacity(clamped);
            }
        });
        return () => unsubscribe();
    }, [labelsOpacity]);

    // State for dynamic subway stops
    const [stops, setStops] = useState({
        blue: ['line-start-blue'],
        orange: ['line-start-orange']
    });

    // Effect to automatically detect stations from the DOM
    useEffect(() => {
        if (narrativeItems.length === 0) return;

        // 1. Find all cards
        const leftCards = Array.from(document.querySelectorAll('.card-left'));
        const rightCards = Array.from(document.querySelectorAll('.card-right'));

        // 2. Extract IDs
        const blueStops = ['line-start-blue', ...leftCards.map(el => el.id).filter(id => id)];
        const orangeStops = ['line-start-orange', ...rightCards.map(el => el.id).filter(id => id)];

        // 3. Update state
        setStops({
            blue: blueStops,
            orange: orangeStops
        });
    }, [narrativeItems]); // Run whenever items change (and initially loaded)

    // State for Dynamic Render Limiting (Scroll Blocking)
    const [renderLimit, setRenderLimit] = useState(Infinity);

    return (
        <>
            {/* Overlay 1: Color Layer (Top of Blur, Bottom of Content) */}
            {/* This handles the initial White fade out */}
            <motion.div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: bgOverlayColor, // Black -> White
                    opacity: overlay1Opacity, // Fades out to reveal Map (and any local blurs)
                    pointerEvents: 'none',
                    zIndex: 1
                }}
            />

            <SubwayLines
                lines={[
                    { color: theme.colors.transport.lineRight, width: 8, stops: stops.orange }, // Orange Line (Right side mainly)
                    { color: theme.colors.transport.lineLeft, width: 8, stops: stops.blue }  // Blue Line (Left side mainly)
                ]}
            />


            {/* === ZONE 2: TRANSPARENT BACKGROUND === */}
            <div className="bg-zone" data-opacity="0" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                {narrativeItems.map((item, index) => {
                    // Truncate content if index exceeds limit
                    if (index > renderLimit) return null;

                    // Calculate index of first body item (first non-intro item)
                    // We do this inside map for simplicity, or could memoize outside
                    // optimization: this findIndex is O(N) inside O(N) map -> O(N^2), but N is small (20-50). Acceptable.
                    // Better: define it once outside. But I can't check 'narrativeData' easily outside without processing.
                    // Let's rely on the fact that Prequel is 0, Title is 1. So Body is 2.
                    // But to be robust:
                    const isBodyStart = index === narrativeItems.findIndex(i =>
                        !(i.type === 'component' && (i.componentName === 'prequel' || i.componentName === 'title'))
                    );

                    if (item.type === 'title') {
                        return (
                            <NarrativeTitle
                                key={item.id}
                                item={item}
                                forwardRef={isBodyStart ? RMRRef : null}
                            />
                        );
                    }

                    if (item.type === 'text') {
                        return (
                            <ProseText
                                key={item.id}
                                item={item}
                                forwardRef={isBodyStart ? RMRRef : null}
                            />
                        );
                    }

                    if (item.type === 'image') {
                        const imageSrc = findAsset(item.src);
                        if (!imageSrc) return null; // Or render a placeholder/error

                        return (
                            <div key={item.id} className="section image-block" style={{
                                width: '100%',
                                maxWidth: '800px', // Constrain width
                                margin: '4rem auto',
                                pointerEvents: 'none', // Images usually decorative nearby text
                                zIndex: 1,
                                textAlign: 'center'
                            }}>
                                <img
                                    src={imageSrc}
                                    alt="Narrative illustration"
                                    style={{
                                        maxWidth: '100%',
                                        height: 'auto',
                                        borderRadius: '8px', // Optional styling
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)' // Optional styling
                                    }}
                                />
                            </div>
                        );
                    }

                    if (item.type === 'component') {
                        const ComponentIdx = componentRegistry[item.componentName];
                        if (!ComponentIdx) return null;

                        // Special handling for 'title' component to attach the Background Ref
                        const isTitleComponent = item.componentName === 'title';

                        // Special handling for deferred loading props
                        const needsControl = item.componentName === 'moto-accident-simulation';

                        // RB: Ref Selection Logic
                        let assignedRef = null;
                        if (isBodyStart) {
                            assignedRef = RMRRef;
                        } else if (isTitleComponent) {
                            // Unified Ref: Both White->Transparent (BodyStart) and Black->White (Title) use the same ref
                            assignedRef = RMRRef;
                        }

                        return (
                            <div key={`${item.id}-${index}`} className="section" style={{
                                width: '100%',
                                maxWidth: item.componentName === 'moto-accident-simulation' ? '100%' : '1200px',
                                margin: item.componentName === 'moto-accident-simulation' ? '0' : '5vh auto',
                                padding: '0',
                                pointerEvents: isTitleComponent ? 'none' : 'auto',
                                zIndex: item.componentName === 'conclusion' ? 0 : 2
                            }}>
                                <ComponentIdx
                                    index={index}
                                    setRenderLimit={needsControl ? setRenderLimit : null}
                                    content={item.content}
                                    forwardRef={assignedRef}
                                />
                            </div>
                        );
                    }

                    return (
                        <NarrativeCard
                            key={item.id}
                            card={item}
                            index={index}
                            onChapterChange={onChapterChange}
                            forwardRef={isBodyStart ? RMRRef : null}
                        />
                    );
                })}


                {/* Conclusion / Credits Section (Only visible when unlocked) */}
                {/* Conclusion / Credits Section (Moved to Dynamic Component 'conclusion') */}

                {/* FALLBACK REFS: Prevent framer-motion crashes if items are missing or hidden by renderLimit */}
                <div
                    style={{ position: 'absolute', top: 0, height: 1, width: 1, pointerEvents: 'none', opacity: 0 }}
                    ref={(el) => {
                        if (!el) return;

                        // Check First Card (RMRRef)
                        const firstCardIdx = narrativeItems.findIndex(i => i.type === 'card');
                        // If card doesn't exist OR if it's clipped by renderLimit, we must attach ref here
                        if (firstCardIdx === -1 || firstCardIdx > renderLimit) {
                            if (RMRRef && !RMRRef.current) RMRRef.current = el;
                        }

                        // Check Title (titleZoneRef)
                        const titleIdx = narrativeItems.findIndex(i => i.componentName === 'title');
                        // If title doesn't exist OR if it's clipped by renderLimit AND we haven't attached it yet
                        if (titleIdx === -1 || titleIdx > renderLimit) {
                            if (titleZoneRef && !titleZoneRef.current) titleZoneRef.current = el;
                        }
                    }}
                />
            </div>
        </>
    );
};

export default Content;



