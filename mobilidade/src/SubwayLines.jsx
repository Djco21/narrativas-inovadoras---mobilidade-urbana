import React, { useEffect, useState, useRef } from 'react';

const SubwayLines = ({ lines = [] }) => {
    const containerRef = useRef(null);
    const [paths, setPaths] = useState([]);
    const [stations, setStations] = useState([]);

    const calculatePaths = () => {
        if (!containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const newPaths = [];
        const newStations = [];

        lines.forEach((line) => {
            const linePoints = [];

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
                        // Card is on Left -> Station on Left (Outer)
                        x = relativeLeft - offset;
                        y = relativeTop + (rect.height / 2);
                    } else if (element.classList.contains('card-right') || offsetFromCenter > 50) {
                        // Card is on Right -> Station on Right (Outer)
                        x = relativeLeft + rect.width + offset;
                        y = relativeTop + (rect.height / 2);
                    } else {
                        // Center -> Station on Bottom
                        x = relativeLeft + (rect.width / 2);
                        y = relativeTop + rect.height + offset;
                    }

                    const point = { x, y, id: stopId };
                    linePoints.push(point);
                    if (!stopId.includes('path-control')) {
                        newStations.push({ ...point, color: line.color, id: stopId });
                    }
                }
            });

            if (linePoints.length < 2) return;

            // Highway Routing with Rounded Corners
            // Station -> Vertical Out -> (Curve) -> Diagonal Out -> (Curve) -> Vertical Highway -> (Curve) -> Diagonal In -> (Curve) -> Vertical In -> Station
            const highwayOffset = 50;
            const userVSegment = 150; // Requested Vertical segment length
            const r = 10; // Corner radius

            let d = `M ${linePoints[0].x} ${linePoints[0].y}`;

            for (let i = 0; i < linePoints.length - 1; i++) {
                const current = linePoints[i];
                const next = linePoints[i + 1];

                const isLeftTrack = (current.x < containerRect.width / 2);

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

                // Calculate Available Vertical Space for the 'vSegments'
                // Formula: dy = vSegment1 + dx1 + dx2 + vSegment2
                // We want vSegment1 = vSegment2 = userVSegment if possible.
                // Available Y for straight vertical parts = dy - dx1 - dx2
                const availableForV = dy - dx1 - dx2;

                let actualVSegment = userVSegment;

                if (availableForV < 2 * r) {
                    // Extremely tight. Cannot fit diagonals + minimal curves.
                    // Fallback to simpler path? or just straight line L
                    // If we can't even fit the diagonals (dy < dx1+dx2), we definitely fallback.
                    d += ` L ${next.x} ${next.y}`;
                    continue;
                } else if (availableForV < 2 * userVSegment) {
                    // We have space for diagonals, but not full 150px vertical leads.
                    // Shrink them to fit.
                    actualVSegment = availableForV / 2;
                    // Ensure we have at least 'r' space for the curve start?
                    // if actualVSegment < r, the curve logic might look weird (control point behind start).
                    // But Q path commands handle it mathematically. Visually might be a bit sharp/looped.
                    // Let's clamp min to 'r'.
                    if (actualVSegment < r) actualVSegment = r;
                }

                // Construct Detailed Highway Path with Rounded Corners

                const sign1 = (highwayX > current.x) ? 1 : -1;
                const sign2 = (next.x > highwayX) ? 1 : -1;

                // 1. Vertical Out from Current
                const y1 = current.y + actualVSegment;
                d += ` L ${current.x} ${y1 - r}`;

                // Curve 1: Vertical to Diagonal
                d += ` Q ${current.x} ${y1} ${current.x + sign1 * r} ${y1 + r}`;

                // 2. Diagonal Out to Highway
                const y_v2 = y1 + dx1;
                // We go to (highwayX, y_v2) but stop 'r' short
                d += ` L ${highwayX - sign1 * r} ${y_v2 - r}`;

                // Curve 2: Diagonal to Vertical Highway
                d += ` Q ${highwayX} ${y_v2} ${highwayX} ${y_v2 + r}`;

                // 3. Vertical Highway Track
                // We go down to y_v3 = next.y - actualVSegment - dx2
                const y_v3 = next.y - actualVSegment - dx2;
                d += ` L ${highwayX} ${y_v3 - r}`;

                // Curve 3: Vertical to Diagonal In
                d += ` Q ${highwayX} ${y_v3} ${highwayX + sign2 * r} ${y_v3 + r}`;

                // 4. Diagonal In
                // We go to (next.x, next.y - actualVSegment) which is y_v4
                const y_v4 = next.y - actualVSegment;
                d += ` L ${next.x - sign2 * r} ${y_v4 - r}`;

                // Curve 4: Diagonal to Vertical In
                d += ` Q ${next.x} ${y_v4} ${next.x} ${y_v4 + r}`;

                // 5. Vertical In to Next Station
                d += ` L ${next.x} ${next.y}`;
            }

            newPaths.push({ d, color: line.color, width: line.width || 6 });
        });

        setPaths(newPaths);
        setStations(newStations);
    };

    useEffect(() => {
        calculatePaths();
        const handleResize = () => calculatePaths();
        window.addEventListener('resize', handleResize);
        const ro = new ResizeObserver(handleResize);
        if (containerRef.current) ro.observe(containerRef.current);

        return () => {
            window.removeEventListener('resize', handleResize);
            ro.disconnect();
        };
    }, [lines]);

    useEffect(() => {
        const timer = setTimeout(calculatePaths, 100);
        return () => clearTimeout(timer);
    }, [lines]);

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
                />
            ))}
            {stations.map((s, i) => (
                <g key={i} transform={`translate(${s.x}, ${s.y})`}>
                    <circle r="6" fill="#fff" stroke={s.color} strokeWidth="3" />
                </g>
            ))}
        </svg>
    );
};

export default SubwayLines;
