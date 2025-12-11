import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

const MotoAccidentSimulation = ({ index, setRenderLimit }) => {
    const sceneRef = useRef(null);
    const engineRef = useRef(null);
    const renderRef = useRef(null);
    const runnerRef = useRef(null);

    // Game State Refs
    const floorRef = useRef(null);
    const rightWallRef = useRef(null);
    const spawnedPeopleRef = useRef(0);
    const mortesRef = useRef(0);
    const lastSpawnTimeRef = useRef(0);

    // React State for UI
    const [mortes, setMortes] = useState(0);

    // Constants
    const TARGET_PESSOAS = 693;
    const HALF_PESSOAS = TARGET_PESSOAS / 2;
    const RAMP_START_DEATHS = 100;
    const BASE_SPEED = 50;
    const MIN_SPAWN_DELAY = 10;
    const motoTexture = "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3cd.png";

    // --- Helper Functions ---
    const getRampProgress = () => {
        const m = mortesRef.current;
        if (m <= RAMP_START_DEATHS) return 0;
        if (m >= HALF_PESSOAS) return 1;
        return (m - RAMP_START_DEATHS) / (HALF_PESSOAS - RAMP_START_DEATHS);
    };

    const getCurrentSpeed = () => {
        const t = getRampProgress();
        const multiplier = 1 + t;
        return BASE_SPEED * multiplier;
    };

    const createBounds = () => {
        if (!sceneRef.current || !engineRef.current || !renderRef.current) return;
        const w = sceneRef.current.clientWidth;
        const h = renderRef.current.options.height;

        const extraLeft = 200;
        const thickness = 80;

        if (floorRef.current) Matter.World.remove(engineRef.current.world, floorRef.current);
        if (rightWallRef.current) Matter.World.remove(engineRef.current.world, rightWallRef.current);

        floorRef.current = Matter.Bodies.rectangle(
            w / 2 - extraLeft / 2,
            h + thickness / 2,
            w + extraLeft,
            thickness,
            { isStatic: true, restitution: 0.4, friction: 0.8 }
        );

        rightWallRef.current = Matter.Bodies.rectangle(
            w + thickness / 2,
            h / 2,
            thickness,
            h,
            { isStatic: true, restitution: 0.4, friction: 0.8 }
        );

        Matter.World.add(engineRef.current.world, [floorRef.current, rightWallRef.current]);

        // Update Render Bounds
        renderRef.current.bounds.max.x = w;
        renderRef.current.bounds.max.y = h;
        renderRef.current.options.width = w;
        renderRef.current.canvas.width = w;
    };

    const spawnMoto = () => {
        if (spawnedPeopleRef.current >= TARGET_PESSOAS || !sceneRef.current || !engineRef.current || !renderRef.current) return;

        const w = sceneRef.current.clientWidth;
        const h = renderRef.current.options.height;
        const boxW = 30;
        const boxH = 20;

        const remaining = TARGET_PESSOAS - spawnedPeopleRef.current;
        let passageiros = (remaining === 1) ? 1 : (Math.random() < 0.5 ? 1 : 2);

        spawnedPeopleRef.current += passageiros;

        const x = -boxW;
        const y = h - boxH / 2 - 2;

        const spriteScaleFactor = 1.2;
        const spriteScaleX = (boxW / 72) * spriteScaleFactor;
        const spriteScaleY = (boxH / 72) * spriteScaleFactor;

        const moto = Matter.Bodies.rectangle(x, y, boxW, boxH, {
            restitution: 0.6,
            friction: 0.3,
            frictionAir: 0.02,
            render: {
                sprite: {
                    texture: motoTexture,
                    xScale: spriteScaleX,
                    yScale: spriteScaleY,
                },
            },
        });

        moto.isMoto = true;
        moto.hasDied = false;
        moto.passengers = passageiros;

        Matter.World.add(engineRef.current.world, moto);

        Matter.Body.setVelocity(moto, {
            x: getCurrentSpeed(),
            y: 0,
        });
    };

    const spawnMotoWithCooldown = () => {
        const now = performance.now();
        if (now - lastSpawnTimeRef.current < MIN_SPAWN_DELAY) {
            return false;
        }
        lastSpawnTimeRef.current = now;
        spawnMoto();
        return true;
    };

    const processCollision = (motoCandidate, other) => {
        if (!motoCandidate || !motoCandidate.isMoto) return;
        if (motoCandidate.hasDied) return;
        if (other === floorRef.current) return;

        motoCandidate.hasDied = true;
        const passengers = motoCandidate.passengers || 1;
        mortesRef.current += passengers;
        setMortes(mortesRef.current);
    };

    // --- Deferred Loading / Scroll Lock Logic ---

    // 1. Truncate Content on Mount
    useEffect(() => {
        if (setRenderLimit && typeof index === 'number') {
            // Check if we are already finished (e.g. hot reload or remount)
            if (spawnedPeopleRef.current < TARGET_PESSOAS) {
                setRenderLimit(index);
            }
        }
    }, [index, setRenderLimit]);

    // 2. Handle Wheel at Bottom
    useEffect(() => {
        const handleWheel = (e) => {
            // If already finished, ensure we are unlocked and ignore
            if (spawnedPeopleRef.current >= TARGET_PESSOAS) {
                if (setRenderLimit) setRenderLimit(Infinity);
                return;
            }

            // Drive simulation if scrolling DOWN and at the BOTTOM
            if (e.deltaY > 0) {
                // Check if we are at bottom of page
                // Use a small buffer (e.g. 50px) to account for mobile bars etc
                const distToBottom = document.documentElement.scrollHeight - (window.innerHeight + window.scrollY);

                // If we are close to bottom, or if the user is trying to scroll past
                if (distToBottom < 50) {
                    e.preventDefault(); // Stop overscroll, focus on simulation

                    const t = getRampProgress();
                    const spawnedFirst = spawnMotoWithCooldown();

                    if (spawnedFirst && spawnedPeopleRef.current < TARGET_PESSOAS) {
                        if (Math.random() < t) {
                            setTimeout(() => spawnMotoWithCooldown(), 120);
                        }
                    }

                    // Check completion
                    if (spawnedPeopleRef.current >= TARGET_PESSOAS) {
                        if (setRenderLimit) setRenderLimit(Infinity);
                    }
                }
            }
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleWheel);
    }, [setRenderLimit]);


    // --- Matter.js Initialization ---
    useEffect(() => {
        const engine = Matter.Engine.create();
        engine.gravity.y = 1.2;
        engineRef.current = engine;

        const render = Matter.Render.create({
            element: sceneRef.current,
            engine: engine,
            options: {
                width: sceneRef.current.clientWidth,
                height: 600,
                wireframes: false,
                background: '#111',
                pixelRatio: 1,
            }
        });
        renderRef.current = render;

        const runner = Matter.Runner.create();
        runnerRef.current = runner;

        Matter.Render.run(render);
        Matter.Runner.run(runner, engine);

        // Initial setup
        createBounds();

        // Event Listeners
        Matter.Events.on(engine, 'collisionStart', (event) => {
            const pairs = event.pairs;
            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];
                processCollision(pair.bodyA, pair.bodyB);
                processCollision(pair.bodyB, pair.bodyA);
            }
        });

        // Resize
        const handleResize = () => createBounds();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            Matter.Render.stop(render);
            Matter.Runner.stop(runner);
            if (render.canvas) render.canvas.remove();
            Matter.World.clear(engine.world);
            Matter.Engine.clear(engine);
        };
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', height: '600px', backgroundColor: '#111', overflow: 'hidden', borderRadius: '8px' }}>
            {/* UI Elements */}
            <div style={{
                position: 'absolute',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '8px 14px',
                background: 'rgba(0, 0, 0, 0.6)',
                color: '#f5f5f5',
                borderRadius: '999px',
                fontSize: '14px',
                pointerEvents: 'none',
                zIndex: 10,
                whiteSpace: 'nowrap'
            }}>
                Role para BAIXO para continuar a história ➡️
            </div>
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#f5f5f5',
                zIndex: 20,
                fontWeight: 700,
                textAlign: 'center',
                pointerEvents: 'none',
                mixBlendMode: 'difference'
            }}>
                <span style={{ display: 'block', fontSize: '120px', lineHeight: 1 }}>{mortes}</span>
                <span style={{ display: 'block', fontSize: '28px', opacity: 0.95, maxWidth: '700px', margin: '0 auto' }}>
                    mortes por acidente de moto nesse ano
                </span>
            </div>
            <div ref={sceneRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};

export default MotoAccidentSimulation;
