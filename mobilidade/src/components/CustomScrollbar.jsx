import React, { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useMotionValue, useMotionValueEvent, animate } from 'framer-motion';

const ARROW_HEIGHT = 14; // Matches width
const BOTTOM_MARGIN = 40; // Safe space for Mapbox attribution (usually ~20-30px)

const CustomScrollbar = ({ showAlarm, isVisible = true }) => {
    const [docHeight, setDocHeight] = useState(0);
    const [winHeight, setWinHeight] = useState(0);

    const [isDragging, setIsDragging] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const trackRef = useRef(null);

    const { scrollY } = useScroll();

    // We use 'y' (transform) for performance instead of 'top'
    const y = useMotionValue(0);

    // Track Resize / DOM Changes
    useEffect(() => {
        const updateMeasurements = () => {
            setDocHeight(document.documentElement.scrollHeight);
            setWinHeight(window.innerHeight);
        };

        window.addEventListener('resize', updateMeasurements);
        const observer = new ResizeObserver(updateMeasurements);
        observer.observe(document.body);

        updateMeasurements();

        return () => {
            window.removeEventListener('resize', updateMeasurements);
            observer.disconnect();
        };
    }, []);

    // Derived Visuals
    // Available height for the UI component (screen - margin)
    const availableHeight = winHeight - BOTTOM_MARGIN;
    const trackHeight = Math.max(0, availableHeight - (2 * ARROW_HEIGHT));

    const scrollRatio = showAlarm ? 1 : (docHeight > 0 ? winHeight / docHeight : 0);
    // Thumb height calculation should now be relative to the track height
    const rawThumbHeight = scrollRatio * trackHeight;
    const thumbHeight = Math.max(20, rawThumbHeight); // Minimum thumb height

    // Helper to calculate Y transform
    const calculateY = (currentScrollY, dNodeH, wNodeH, tHeight) => {
        const maxScroll = Math.max(1, dNodeH - wNodeH);
        const maxTop = Math.max(0, trackHeight - tHeight);
        return (currentScrollY / maxScroll) * maxTop;
    };

    // 1. Sync on Scroll (Instant - Transform)
    useMotionValueEvent(scrollY, "change", (latest) => {
        // Instant update using transform (y)
        const newY = calculateY(latest, docHeight, winHeight, thumbHeight);
        y.set(newY);
    });

    // 2. Sync on Layout Change (Animated)
    useEffect(() => {
        const currentScroll = scrollY.get();
        const newY = calculateY(currentScroll, docHeight, winHeight, thumbHeight);

        // Use animate for smooth visual adjustment when effective height changes
        animate(y, newY, { duration: 0.5, ease: 'easeInOut' });
    }, [docHeight, winHeight, thumbHeight, scrollY, y, trackHeight]);

    // --- Interaction ---
    const handleTrackClick = (e) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const oy = e.clientY - rect.top; // Click position relative to track top

        const maxScroll = Math.max(1, docHeight - winHeight);
        const p = oy / rect.height;

        window.scrollTo({
            top: p * maxScroll,
            behavior: 'smooth'
        });
    };

    const handlePointerDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    // Arrow Scroll Logic
    const handleScrollSteps = (direction) => {
        const step = window.innerHeight * 0.1; // Scroll 10% of screen
        const current = window.scrollY;
        const target = direction === 'up' ? current - step : current + step;
        window.scrollTo({
            top: target,
            behavior: 'smooth'
        });
    };

    useEffect(() => {
        const handlePointerMove = (e) => {
            if (!isDragging || !trackRef.current) return;
            e.preventDefault();

            const rect = trackRef.current.getBoundingClientRect();
            // Relative Y inside the track
            const relativeY = e.clientY - rect.top;

            // Percentage within the track
            const p = Math.max(0, Math.min(1, relativeY / trackHeight));
            const maxScroll = Math.max(1, docHeight - winHeight);

            window.scrollTo({
                top: p * maxScroll,
                behavior: 'auto'
            });
        };

        const handlePointerUp = () => {
            setIsDragging(false);
            document.body.style.userSelect = '';
        };

        if (isDragging) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
            document.body.style.userSelect = 'none';
        }

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging, winHeight, docHeight, trackHeight]);

    if (docHeight <= winHeight) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isVisible ? 1 : 0 }}
            transition={{ duration: 0.5 }}
            style={{
                position: 'fixed',
                top: 0,
                right: 0,
                height: `calc(100vh - ${BOTTOM_MARGIN}px)`, // Adjust visual height
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: isHovered || isDragging ? '14px' : '8px',
                transition: 'width 0.2s ease',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Up Arrow */}
            <div
                onClick={() => handleScrollSteps('up')}
                style={{
                    width: '100%',
                    height: ARROW_HEIGHT,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isHovered || isDragging ? 'rgba(0,0,0,0.5)' : 'transparent',
                    marginBottom: '2px'
                }}
            >
                <div style={{
                    width: 0,
                    height: 0,
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderBottom: '6px solid white'
                }} />
            </div>

            {/* Track */}
            <motion.div
                className="custom-scrollbar-track"
                ref={trackRef}
                onClick={handleTrackClick}
                style={{
                    flexGrow: 1,
                    width: '100%',
                    position: 'relative',
                    backgroundColor: 'transparent',
                }}
            >
                <motion.div
                    className="custom-scrollbar-thumb"
                    onPointerDown={handlePointerDown}
                    style={{
                        position: 'absolute',
                        top: 0, // Top stays 0, we move via transform (y)
                        y: y,   // Bind to motion value
                        height: thumbHeight,
                        width: '100%',
                        opacity: isHovered || isDragging ? 0.9 : 0.5,
                        backgroundColor: 'white',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        willChange: 'transform' // Hint for GPU
                    }}
                    animate={{
                        opacity: isHovered || isDragging ? 0.9 : 0.5,
                        height: thumbHeight
                    }}
                    transition={{
                        height: { duration: 0.5, ease: 'easeInOut' },
                        width: { duration: 0.2 },
                        opacity: { duration: 0.2 }
                        // NO transition for 'y'
                    }}
                />
            </motion.div>

            {/* Down Arrow */}
            <div
                onClick={() => handleScrollSteps('down')}
                style={{
                    width: '100%',
                    height: ARROW_HEIGHT,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isHovered || isDragging ? 'rgba(0,0,0,0.5)' : 'transparent',
                    marginTop: '2px'
                }}
            >
                <div style={{
                    width: 0,
                    height: 0,
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: '6px solid white'
                }} />
            </div>
        </motion.div>
    );
};

export default CustomScrollbar;
