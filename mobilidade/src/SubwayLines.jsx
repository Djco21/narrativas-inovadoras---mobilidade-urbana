import React, { useEffect, useState, useRef } from 'react';
import { theme } from './theme';

const SubwayLines = ({ lines = [] }) => {
    const containerRef = useRef(null);
    const [paths, setPaths] = useState([]);
    const [stations, setStations] = useState([]);

    const calculatePaths = () => {
        if (!containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const W = containerRect.width;
        const newPaths = [];
        const newStations = [];

        lines.forEach((line) => {
            const linePoints = [];

            // 1. Gather Points from DOM
            line.stops.forEach((stopId) => {
                const element = document.getElementById(stopId);
                if (element) {
                    const rect = element.getBoundingClientRect();

                    // Calculate relative position within the container
                    const relativeTop = rect.top - containerRect.top;
                    const relativeLeft = rect.left - containerRect.left;

                    const elementCenter = relativeLeft + (rect.width / 2);
                    const containerCenter = containerRect.width / 2;
                    const offsetFromCenter = elementCenter - containerCenter;

                    let x, y;
                    const offset = 20; // Distance from card edge to station center

                    if (element.classList.contains('card-left') || offsetFromCenter < -50) {
                        x = relativeLeft - offset;
                        y = relativeTop + (rect.height / 2);
                    } else if (element.classList.contains('card-right') || offsetFromCenter > 50) {
                        x = relativeLeft + rect.width + offset;
                        y = relativeTop + (rect.height / 2);
                    } else {
                        x = relativeLeft + (rect.width / 2);
                        y = relativeTop + rect.height + offset;
                    }

                    const point = { x, y, id: stopId };
                    linePoints.push(point);
                    if (!stopId.includes('path-control') && !stopId.includes('line-start')) {
                        newStations.push({ ...point, color: line.color, id: stopId });
                    }
                }
            });

            if (linePoints.length < 2) return;

            // Highway configuration
            const highwayOffset = 35;
            const userVSegment = 150;
            const r = 10;

            // -- START LOGIC OVERRIDE --
            // We want the start point (i=0) to be calculated mathematically (45 deg projection) 
            // regardless of where the ghost div is.
            // We look at the FIRST SEGMENT: Start -> Point[1]
            // We need to establish the highway X for this track.

            // Look ahead to Point 1 to determine Highway X
            const next = linePoints[1];
            // Infer track side from Point 1 (assuming standard behavior)
            const isLeftTrack = (next.x < W / 2);

            // Calculate Target Highway X
            let highwayX;
            // Note: highwayX is usually calculated between two points. 
            // Here we assume the highway is consistently 'inner' relative to the station.
            if (isLeftTrack) {
                // If station is Left, Highway is further Left? Or Inner? 
                // Standard loop: highwayX = min(start, next) - offset.
                // If we want consistent highway, let's fix it relative to 'next'.
                // If next is Left Station, Highway is slightly Right of it? Or Left?
                // Look at loop logic: 
                // isLeftTrack (based on current/next average or logic) -> highwayX = min - offset.
                // Let's stick to the rule: Highway is "Central" relative to stations?
                // Actually, the loop determines highwayX dynamically per segment.
                // Let's assume we want to hit the SAME highway as segment 0->1 would have.
                // If Point 1 is at X1. Current (Start) is unknown. 
                // Let's pick highwayX = next.x + offset (if Left track) or next.x - offset?
                // Visual reference: Orange (Right) -> Highway is to the Left of it (Center-wards).
                // Blue (Left) -> Highway is to the Right of it (Center-wards).
                // So if Left Track: HighwayX > Next.x.
                // Loop logic was: if isLeftTrack (x < mid), highwayX = min - offset. 
                // Wait, logic says `min - offset` -> Further LEFT. Visual artifact shows highway on outside?
                // Let's re-read loop:
                // check `isLeftTrack = current.x < mid`.
                // if Left: `min(curr, next) - offset`.
                // So Highway is to the LEFT of the Leftmost point.
                // This means Highway is on the FAR OUTER EDGE. 
                // OK. So for Blue (Left), Highway is Left of `next`. `highwayX = next.x - offset`.
                // For Orange (Right), Highway is Right of `next`. `highwayX = next.x + offset`.

                highwayX = next.x - highwayOffset;
            } else {
                highwayX = next.x + highwayOffset;
            }

            // Define where the diagonal meets the highway (Vertical transition)
            // We want lines to enter from the SIDES (x < 0 or x > W), not the TOP.
            // To ensure side entry, the diagonal must reach the side edge (x=0/W) at y > 0.
            // Left: y = x - highwayX + transitionY. At x=0, y = transitionY - highwayX.
            // Right: y = -x + highwayX + transitionY. At x=W, y = transitionY - (W - highwayX).

            const startOffset = 50; // Tolerance for line thickness & off-screen start
            let minTransitionY = 150;

            // Calculate required transitionY to hit side at y >= -10 (safely visible)
            if (isLeftTrack) {
                // distinct logic to ensure we prefer side entry
                // Need transitionY >= highwayX - 10
                minTransitionY = Math.max(150, highwayX - 20);
            } else {
                // Need transitionY >= (W - highwayX) - 10
                minTransitionY = Math.max(150, (W - highwayX) - 20);
            }

            // Clamp max transitionY to not exceed the first station (minus some space)
            // But we don't have perfect info on next station Y availability without complex logic.
            // We'll trust the layout usually has space or accept top-entry if squeezed.
            const transitionY = Math.min(minTransitionY, next.y - 50);

            let startX, startY;

            if (isLeftTrack) {
                // Blue Line (Left)
                // Force start off-screen to the Left
                startX = -startOffset;
                // y = x - highwayX + transitionY
                startY = startX - highwayX + transitionY;
            } else {
                // Orange Line (Right)
                // Force start off-screen to the Right
                startX = W + startOffset;
                // y = -x + highwayX + transitionY
                startY = -startX + highwayX + transitionY;
            }

            // Override Point 0
            linePoints[0] = { x: startX, y: startY, id: 'calculated-start' };
            // -- END LOGIC OVERRIDE --


            let d = `M ${linePoints[0].x} ${linePoints[0].y}`;

            for (let i = 0; i < linePoints.length - 1; i++) {
                const current = linePoints[i];
                const next = linePoints[i + 1];

                // RE-CALCULATE logic per segment as before
                const isLeftTrack = (current.x < W / 2);

                let highwayX;
                if (isLeftTrack) {
                    highwayX = Math.min(current.x, next.x) - highwayOffset;
                } else {
                    highwayX = Math.max(current.x, next.x) + highwayOffset;
                }

                // Calculate vertical space
                const dy = next.y - current.y;

                // Calculate diagonal sizes (45 degrees: dy = dx)
                // We need to reach highwayX from current.x
                const dx1 = Math.abs(highwayX - current.x);
                const dx2 = Math.abs(highwayX - next.x);

                const availableForV = dy - dx1 - dx2;

                let actualVSegment = userVSegment;

                // Override for Start Segment
                if (i === 0) {
                    actualVSegment = 0; // Force immediate diagonal
                } else {
                    if (availableForV < 2 * r) {
                        d += ` L ${next.x} ${next.y}`;
                        continue;
                    } else if (availableForV < 2 * userVSegment) {
                        actualVSegment = availableForV / 2;
                        if (actualVSegment < r) actualVSegment = r;
                    }
                }

                const sign1 = (highwayX > current.x) ? 1 : -1;
                const sign2 = (next.x > highwayX) ? 1 : -1;

                // 1. Vertical Out
                // For i=0, actualVSegment is 0, so this just moves to current.x, current.y
                const y1 = current.y + actualVSegment;
                if (i !== 0) {
                    d += ` L ${current.x} ${y1 - r}`;
                    // Curve 1
                    d += ` Q ${current.x} ${y1} ${current.x + sign1 * r} ${y1 + r}`;
                } else {
                    // Just move to start (already at M)
                    // No vertical out, no curve 1.
                    // The path effectively starts on the diagonal.
                    // We need to verify where the diagonal STARTS.
                    // L (highwayX - sign1 * r) (y_v2 - r)
                    // current.y = startY. y1 = startY.
                    // y_v2 = startY + dx1.
                    // dx1 = Abs(highwayX - startX).
                    // If we calculated startX correctly via trig, startY + dx1 SHOULD be precisely 'transitionY'.
                    // So we draw line to (highwayX +/- r, transitionY - r).
                }

                // 2. Diagonal Out to Highway
                const y_v2 = y1 + dx1;
                d += ` L ${highwayX - sign1 * r} ${y_v2 - r}`;

                // Curve 2: Diagonal to Vertical Highway
                d += ` Q ${highwayX} ${y_v2} ${highwayX} ${y_v2 + r}`;

                // 3. Vertical Highway Track
                const y_v3 = next.y - actualVSegment - dx2;
                d += ` L ${highwayX} ${y_v3 - r}`;

                // Curve 3: Vertical to Diagonal In
                d += ` Q ${highwayX} ${y_v3} ${highwayX + sign2 * r} ${y_v3 + r}`;

                // 4. Diagonal In
                const y_v4 = next.y - actualVSegment;
                d += ` L ${next.x - sign2 * r} ${y_v4 - r}`;

                // Curve 4: Diagonal to Vertical In
                d += ` Q ${next.x} ${y_v4} ${next.x} ${y_v4 + r}`;

                // 5. Vertical In to Next Station
                d += ` L ${next.x} ${next.y}`;
            }

            newPaths.push({ d, color: line.color, width: line.width || 6 });
        });

        // Deep check if update is needed
        setPaths(prev => {
            if (JSON.stringify(prev) === JSON.stringify(newPaths)) return prev;
            return newPaths;
        });
        setStations(prev => {
            if (JSON.stringify(prev) === JSON.stringify(newStations)) return prev;
            return newStations;
        });
    };

    const linesKey = JSON.stringify(lines);

    useEffect(() => {
        // Debounce function to limit calculation frequency
        let timeoutId;
        const debouncedCalculate = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                requestAnimationFrame(calculatePaths);
            }, 100);
        };

        // Initial calculation (immediate, then debounced for safety on layout shift)
        calculatePaths();
        // Backup run for late loading fonts/images affecting layout
        const initialTimer = setTimeout(calculatePaths, 500);

        window.addEventListener('resize', debouncedCalculate);
        const ro = new ResizeObserver(debouncedCalculate);
        if (containerRef.current) ro.observe(containerRef.current);

        return () => {
            window.removeEventListener('resize', debouncedCalculate);
            ro.disconnect();
            clearTimeout(timeoutId);
            clearTimeout(initialTimer);
        };
    }, [linesKey]);

    return (
        <svg
            ref={containerRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 5,
                overflow: 'visible'
            }}
        >
            {paths.map((p, i) => (
                <path
                    key={i}
                    d={p.d}
                    stroke={p.color}
                    strokeWidth={p.width}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="1"
                />
            ))}
            {stations.map((s, i) => (
                <g key={i} transform={`translate(${s.x}, ${s.y})`}>
                    <circle r="9" fill={theme.colors.transport.stations.fill} stroke={theme.colors.transport.stations.stroke} strokeWidth="5" />
                </g>
            ))}
        </svg>
    );
};

export default SubwayLines;
