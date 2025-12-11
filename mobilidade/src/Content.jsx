import React, { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import SubwayLines from './SubwayLines';
import InteractionBlocker from './InteractionBlocker';
import { narrativeData } from './narrativeData';
import { theme } from './theme';
import { componentRegistry } from './componentRegistry';

// Simple markdown formatter
const formatText = (text) => {
    if (!text) return null;
    // Replace **bold**
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    // Replace *italic*
    formatted = formatted.replace(/\*(.*?)\*/g, '<i>$1</i>');

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
    const blurOpacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0, 1, 1, 0]);

    // Split combined text items into separate paragraphs
    const paragraphs = item.text.split(/\n\s*\n/);

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
        <h3 style={{
            marginTop: 0,
            marginBottom: '0.5rem',
            color: theme.colors.transport.metroLine,
            fontFamily: '"Share Tech Mono", monospace',
            fontSize: '1.5rem',
            letterSpacing: '0.05em',
            animation: isBlinking ? 'blink 0.5s step-end infinite' : 'none'
        }}>
            {displayTime}
        </h3>
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
        if (isInView && card.triggerAfter) {
            console.log(`>>> TRIGGERING CHAPTER for ${card.id}: ${card.triggerAfter}`);
            onChapterChange(card.triggerAfter);
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

const Content = ({ onChapterChange }) => {
    // Dynamic Background State
    // Scroll Interpolation Logic for Prologue -> Title (Black -> White)
    const titleZoneRef = useRef(null);
    const { scrollYProgress: titleProgress } = useScroll({
        target: titleZoneRef,
        offset: ["start end", "center center"] // Starts when top of Title hits bottom of Viewport
    });

    const bgOverlayColor = useTransform(titleProgress, [0, 1], [theme.colors.background.prologue, theme.colors.background.title]);


    // Scroll Interpolation Logic for Title -> Narrative (White -> Transparent)
    const RMRRef = useRef(null);
    const { scrollYProgress: narrativeProgress } = useScroll({
        target: RMRRef,
        offset: ["start center", "end center"] // Starts when top of Narrative hits bottom
    });

    // Control the Fade Out of the White Background
    const overlay1Opacity = useTransform(narrativeProgress, [0, 1], [1, 0]);

    // State for dynamic subway stops
    const [stops, setStops] = useState({
        blue: ['line-start-blue'],
        orange: ['line-start-orange']
    });

    // Effect to automatically detect stations from the DOM
    useEffect(() => {
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
    }, []); // Run ONCE on mount

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
                    zIndex: 0
                }}
            />

            <SubwayLines
                lines={[
                    { color: theme.colors.transport.lineRight, width: 8, stops: stops.orange }, // Orange Line (Right side mainly)
                    { color: theme.colors.transport.lineLeft, width: 8, stops: stops.blue }  // Blue Line (Left side mainly)
                ]}
            />

            {/* === ZONE 1: WHITE BACKGROUND (TITLE) === */}
            <div className="bg-zone" data-opacity="1" data-color="#fff" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minHeight: '50vh' }}>
                <div
                    className="section"
                    style={{ zIndex: 1, position: 'relative', minWidth: '80vw', textAlign: 'center' }}
                >
                    <h1 ref={titleZoneRef} style={{ fontSize: '4rem', whiteSpace: 'nowrap', color: theme.colors.narrative.title }}>{narrativeData.title.text}</h1>

                    {/* Diverging Start Points (Invisible) */}
                    <div id="line-start-blue" style={{ position: 'absolute', top: '15vh', left: '35%', height: '10px', width: '10px' }} />
                    <div id="line-start-orange" style={{ position: 'absolute', top: '15vh', left: '65%', height: '10px', width: '10px' }} />
                </div>
            </div>


            {/* === ZONE 2: TRANSPARENT BACKGROUND === */}
            <div className="bg-zone" data-opacity="0" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                {narrativeData.items.map((item, index) => {
                    // Truncate content if index exceeds limit
                    if (index > renderLimit) return null;

                    const isFirst = index === 0;

                    if (item.type === 'title') {
                        return (
                            <NarrativeTitle
                                key={item.id}
                                item={item}
                                forwardRef={isFirst ? RMRRef : null}
                            />
                        );
                    }

                    if (item.type === 'text') {
                        return (
                            <ProseText
                                key={item.id}
                                item={item}
                                forwardRef={isFirst ? RMRRef : null}
                            />
                        );
                    }

                    if (item.type === 'component') {
                        const ComponentIdx = componentRegistry[item.componentName];
                        if (!ComponentIdx) return null;

                        // Special handling for 'title' component to attach the Background Ref
                        const isTitleComponent = item.componentName === 'title';

                        // Special handling for deferred loading props
                        const needsControl = item.componentName === 'moto-accident-simulation';

                        return (
                            <div key={item.uniqueKey || item.id} className="section" style={{
                                width: '100%',
                                maxWidth: '1200px',
                                margin: '5vh auto',
                                padding: '0',
                                pointerEvents: 'auto',
                                zIndex: 2
                            }}>
                                <ComponentIdx
                                    index={index}
                                    setRenderLimit={needsControl ? setRenderLimit : null}
                                    content={item.content}
                                    forwardRef={isTitleComponent ? titleZoneRef : null}
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
                            forwardRef={index === 0 ? RMRRef : null}
                        />
                    );
                })}


                {/* Conclusion / Credits Section (Only visible when unlocked) */}
                {renderLimit === Infinity && (
                    <div className="section conclusion" style={{
                        minHeight: '50vh',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginTop: '4rem'
                    }}>
                        {/* Placeholder for Credits/Socials */}
                        <div style={{ height: '100px' }} />
                    </div>
                )}

                {/* FALLBACK REFS: Prevent framer-motion crashes if items are missing or hidden by renderLimit */}
                <div
                    style={{ position: 'absolute', top: 0, height: 1, width: 1, pointerEvents: 'none', opacity: 0 }}
                    ref={(el) => {
                        if (!el) return;

                        // Check First Card (RMRRef)
                        const firstCardIdx = narrativeData.items.findIndex(i => i.type === 'card');
                        // If card doesn't exist OR if it's clipped by renderLimit, we must attach ref here
                        if (firstCardIdx === -1 || firstCardIdx > renderLimit) {
                            if (RMRRef && !RMRRef.current) RMRRef.current = el;
                        }

                        // Check Title (titleZoneRef)
                        const titleIdx = narrativeData.items.findIndex(i => i.componentName === 'title');
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


