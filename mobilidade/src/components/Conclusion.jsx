import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import InteractionBlocker from './InteractionBlocker';
import { theme } from '../theme';

const formatText = (text) => {
    if (!text) return null;
    // Use special conclusionBold color
    let formatted = text.replace(/\*\*(.*?)\*\*/g, `<b style="color: ${theme.colors.narrative.conclusionBold}">$1</b>`);
    formatted = formatted.replace(/\*(.*?)\*/g, `<i style="color: ${theme.colors.narrative.italic}">$1</i>`);
    // Basic newline to br
    formatted = formatted.replace(/\n/g, '<br/>');
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
};

const Conclusion = ({ content }) => {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"]
    });

    // Fade in blur acts as "spotlight" on the text
    // Matches ProseText logic: [0.2, 0.3, 0.7, 0.8] -> [0, 1, 1, 0]
    const blurOpacity = useTransform(scrollYProgress, [0.2, 0.3, 0.7, 0.8], [0, 1, 1, 0]);

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
                    ref={ref}
                    className="section conclusion"
                    style={{
                        minHeight: '50vh',
                        width: '100%',
                        maxWidth: '1200px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        margin: '10vh auto',
                        padding: '2rem 10vw',
                        textAlign: 'center',
                        pointerEvents: 'auto',
                        position: 'relative', // for z-index
                        zIndex: 1
                    }}
                >
                    {content && content.map((block, i) => (
                        <div key={i} style={{
                            marginBottom: '2rem',
                            fontSize: '12pt',
                            color: theme.colors.narrative.text
                        }}>
                            {formatText(block)}
                        </div>
                    ))}
                </div>
            </InteractionBlocker>
        </>
    );
};

export default Conclusion;
