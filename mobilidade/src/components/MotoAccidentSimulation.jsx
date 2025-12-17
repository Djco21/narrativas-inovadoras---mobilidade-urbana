import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '../theme';
import motoAmarela from '../assets/moto_amarela.png';
import motoAzul from '../assets/moto_azul.png';
import motoLaranja from '../assets/moto_laranja.png';
import motoRed from '../assets/moto_red.png';
import motoVerde from '../assets/moto_verde.png';

const MOTO_TEXTURES = [motoAmarela, motoAzul, motoLaranja, motoRed, motoVerde];

const MotoAccidentSimulation = ({ index, setRenderLimit, content }) => {
    // Constants
    const TARGET_PESSOAS = 693;
    const HALF_PESSOAS = TARGET_PESSOAS / 2;
    const RAMP_START_DEATHS = 100;
    const BASE_SPEED = 50;
    const MIN_SPAWN_DELAY = 10;
    // const motoTexture = "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3cd.png";

    // Text Sections
    const rawSections = Array.isArray(content) ? content : (content ? content.split(/\n\s*\n/) : []);

    // Helper to read initial state
    const getInitialCompleted = () => {
        if (typeof sessionStorage === 'undefined') return false;
        return sessionStorage.getItem('narrative_simulation_completed') === 'true';
    };
    const initialCompleted = getInitialCompleted();

    const sceneRef = useRef(null);
    const engineRef = useRef(null);
    const renderRef = useRef(null);
    const runnerRef = useRef(null);

    // Game State Refs
    const floorRef = useRef(null);
    const rightWallRef = useRef(null);
    const spawnedPeopleRef = useRef(initialCompleted ? TARGET_PESSOAS : 0);
    const mortesRef = useRef(initialCompleted ? TARGET_PESSOAS : 0);
    const lastSpawnTimeRef = useRef(0);

    // React State for UI
    const [mortes, setMortes] = useState(initialCompleted ? TARGET_PESSOAS : 0);
    const [activeSectionIndex, setActiveSectionIndex] = useState(initialCompleted ? 100 : 0);
    const [isFinale, setIsFinale] = useState(initialCompleted);
    const [resetTrigger, setResetTrigger] = useState(0); // Added back
    const [showSkipConfirm, setShowSkipConfirm] = useState(false);
    const [barTransition, setBarTransition] = useState({ duration: 0 }); // Default instant
    const textSections = ['', ...rawSections];

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
        const h = sceneRef.current.clientHeight;

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

    // Pre-load textures to get dimensions
    const textureInfosRef = useRef([]);

    useEffect(() => {
        const loadTextures = () => {
            MOTO_TEXTURES.forEach(src => {
                const img = new Image();
                img.src = src;
                img.onload = () => {
                    textureInfosRef.current.push({
                        src,
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                        ratio: img.naturalWidth / img.naturalHeight
                    });
                };
            });
        };
        loadTextures();
    }, []);

    // Unlock scroll if initially completed
    useEffect(() => {
        if (initialCompleted && setRenderLimit) {
            setRenderLimit(Infinity);
        }
    }, [initialCompleted, setRenderLimit]);

    const spawnMoto = () => {
        if (spawnedPeopleRef.current >= TARGET_PESSOAS || !sceneRef.current || !engineRef.current || !renderRef.current) return;
        // Wait for at least one texture to load
        if (textureInfosRef.current.length === 0) return;

        const w = sceneRef.current.clientWidth;
        const h = renderRef.current.options.height;

        // Pick random texture info
        const texInfo = textureInfosRef.current[Math.floor(Math.random() * textureInfosRef.current.length)];

        // Fixed height, calculated width based on aspect ratio
        const boxH = 25; // Slightly larger base size
        const boxW = boxH * texInfo.ratio;

        // Ensure reasonable limits
        const clampedW = Math.max(15, Math.min(boxW, 60));

        const remaining = TARGET_PESSOAS - spawnedPeopleRef.current;
        let passageiros = (remaining === 1) ? 1 : (Math.random() < 0.5 ? 1 : 2);

        spawnedPeopleRef.current += passageiros;

        const x = -clampedW * 2; // Spawn off-screen left
        const y = h - boxH / 2 - 2;

        // Scale sprite to match the physics body size
        // Sprite scale = (Target Size in World Units) / (Image Size in Pixels)
        // We add a small scale factor to make the image slightly larger than the hitbox for better visuals
        const spriteScaleFactor = 1.3;
        const spriteScaleX = (clampedW / texInfo.width) * spriteScaleFactor;
        const spriteScaleY = (boxH / texInfo.height) * spriteScaleFactor;

        const moto = Matter.Bodies.rectangle(x, y, clampedW, boxH, {
            restitution: 0.5, // Reduced bounciness
            friction: 0.3,
            frictionAir: 0.02,
            angle: 0, // Keep them upright initially
            render: {
                sprite: {
                    texture: texInfo.src,
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
            y: (Math.random() - 0.5) * 2, // Slight vertical variation
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

        // Check for Finale Trigger
        if (mortesRef.current >= TARGET_PESSOAS) {
            if (!isFinale) {
                setIsFinale(true);
                // Unlock scroll after animation delay
                setTimeout(() => {
                    if (setRenderLimit) setRenderLimit(Infinity);
                }, 1600);
            }
        }

        // Update Text Section (Only if not in finale state)
        if (textSections.length > 0) {
            const progress = mortesRef.current / TARGET_PESSOAS;
            const sectionIndex = Math.floor(progress * textSections.length);
            const idx = Math.min(sectionIndex, textSections.length - 1);
            setActiveSectionIndex(idx);
        }
    };

    // --- Deferred Loading / Scroll Lock Logic ---

    // 1. Truncate Content on Mount
    useEffect(() => {
        if (setRenderLimit && typeof index === 'number') {
            if (spawnedPeopleRef.current < TARGET_PESSOAS) {
                setRenderLimit(index);
            }
        }
    }, [index, setRenderLimit]);

    // 2. Handle Wheel at Bottom (Optimized with RAF)
    useEffect(() => {
        let rafId;
        const handleWheel = (e) => {
            // Cancel any pending frame to avoid stacking
            if (rafId) cancelAnimationFrame(rafId);

            // If already finished, ensure we are unlocked and ignore
            if (spawnedPeopleRef.current >= TARGET_PESSOAS) {
                // Should be unlocked by timeout, but if user scrolls aggressively after fin, ensure it's open
                // Actually, relying on timeout is safer for the "Wait for animation" UX.
                // We'll let the timeout unlock it.
                return;
            }

            if (e.deltaY > 0) {
                const distToBottom = document.documentElement.scrollHeight - (window.innerHeight + window.scrollY);

                if (distToBottom < 50) {
                    e.preventDefault();

                    // Schedule logic for next frame
                    rafId = requestAnimationFrame(() => {
                        const t = getRampProgress();
                        const spawnedFirst = spawnMotoWithCooldown();

                        if (spawnedFirst && spawnedPeopleRef.current < TARGET_PESSOAS) {
                            if (Math.random() < t) {
                                setTimeout(() => spawnMotoWithCooldown(), 120);
                            }
                        }
                    });
                }
            }
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            window.removeEventListener('wheel', handleWheel);
            if (rafId) cancelAnimationFrame(rafId);
        };
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
                height: sceneRef.current.clientHeight,
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

        createBounds();

        Matter.Events.on(engine, 'collisionStart', (event) => {
            const pairs = event.pairs;
            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];
                processCollision(pair.bodyA, pair.bodyB);
                processCollision(pair.bodyB, pair.bodyA);
            }
        });

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
    }, [resetTrigger]); // Re-run when resetTrigger changes

    const formatSimText = (text) => {
        if (!text) return null;
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<b style="color: #fff">$1</b>');
        return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
    };

    const handleSkipClick = () => {
        setShowSkipConfirm(true);
    };

    const confirmSkip = () => {
        setShowSkipConfirm(false);
        setBarTransition({ type: 'spring', stiffness: 20, damping: 10, mass: 0.5 }); // Enable animation for big jump

        // Complete State
        const finalDeaths = TARGET_PESSOAS;
        sessionStorage.setItem('narrative_simulation_completed', 'true');

        setMortes(finalDeaths);
        setIsFinale(true);
        setActiveSectionIndex(100); // Past end
        setRenderLimit(Infinity); // Unlock scroll

        // Update Refs
        mortesRef.current = finalDeaths;
        spawnedPeopleRef.current = finalDeaths;

        // Reset transition after animation
        setTimeout(() => setBarTransition({ duration: 0 }), 1000);
    };

    const cancelSkip = () => {
        setShowSkipConfirm(false);
    };

    const handleRestart = () => {
        if (!engineRef.current) return;

        setBarTransition({ type: 'spring', stiffness: 20, damping: 10, mass: 0.5 }); // Enable animation for big jump

        // Reset State
        sessionStorage.setItem('narrative_simulation_completed', 'false');
        setMortes(0);
        setIsFinale(false);
        setActiveSectionIndex(0);
        setRenderLimit(index); // Re-lock scroll

        // Reset Refs
        spawnedPeopleRef.current = 0;
        mortesRef.current = 0;
        lastSpawnTimeRef.current = 0;

        // Trigger Re-Mount of Physics
        setResetTrigger(prev => prev + 1);

        // Reset transition after animation
        setTimeout(() => setBarTransition({ duration: 0 }), 1000);
    };

    // Gradually despawn motos when finale is reached
    useEffect(() => {
        if (isFinale && engineRef.current) {
            const cleanupInterval = setInterval(() => {
                if (!engineRef.current) return;

                const bodies = Matter.Composite.allBodies(engineRef.current.world);
                const motos = bodies.filter(b => b.isMoto);

                if (motos.length === 0) {
                    clearInterval(cleanupInterval);
                    return;
                }

                // Despawn batch (clears ~450 motos in approx 1.2s)
                const batch = motos.slice(0, 15);
                batch.forEach(moto => {
                    Matter.World.remove(engineRef.current.world, moto);
                });
            }, 40);

            return () => clearInterval(cleanupInterval);
        }
    }, [isFinale]);

    return (
        <div style={{
            position: 'relative',
            width: '100vw',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
        }}>
            <div style={{
                position: 'relative',
                width: 'calc(100vw - (2 * var(--card-margin)))', // 10vw on each side
                height: '600px',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#111',
                overflow: 'hidden',
                borderRadius: '8px',
                pointerEvents: 'auto', // Re-enable pointer events for the simulation
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}>

                {/* --- HEADER (Controls) --- */}
                <div style={{
                    height: '64px',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 1rem',
                    backgroundColor: '#1a1a1a', // Slightly lighter header
                    borderBottom: '1px solid #333',
                    zIndex: 50
                }}>
                    {/* Left: Restart Button */}
                    <ControlButton
                        onClick={handleRestart}
                        tooltip="Reiniciar Simulação"
                        icon={
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="19 20 9 12 19 4 19 20" />
                                <line x1="5" y1="19" x2="5" y2="5" />
                            </svg>
                        }
                    />

                    {/* Center: Progress Bar */}
                    <div style={{
                        flex: 1,
                        position: 'relative', // Context for absolute children
                        height: '8px',
                        margin: '0 1.5rem',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '2px',
                        overflow: 'hidden'
                    }}>
                        {/* 1. Underlying Single Animated Bar */}
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{
                                width: `${Math.min((mortes / TARGET_PESSOAS) * 100, 100)}%`
                            }}
                            transition={barTransition}
                            style={{
                                height: '100%',
                                backgroundColor: theme.colors.simulation.progressBar,
                            }}
                        />

                        {/* 2. Divider Mask Overlay */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            pointerEvents: 'none'
                        }}>
                            {textSections.map((_, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        flex: 1,
                                        borderRight: idx < textSections.length - 1 ? '2px solid #1a1a1a' : 'none', // Color matches header bg
                                        height: '100%'
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right: Skip Button */}
                    <ControlButton
                        onClick={handleSkipClick}
                        tooltip="Pular Simulação"
                        icon={
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="5 4 15 12 5 20 5 4" />
                                <line x1="19" y1="5" x2="19" y2="19" />
                            </svg>
                        }
                    />
                </div>

                {/* --- BODY (Simulation) --- */}
                <div style={{
                    position: 'relative',
                    flex: 1,
                    width: '100%',
                    overflow: 'hidden'
                }}>

                    {/* Death Counter - Animated */}
                    <AnimatePresence>
                        {mortes > 0 && (
                            <motion.div
                                initial={{ opacity: 1, scale: 1, top: '25%' }} // Instant appearance
                                animate={isFinale ? {
                                    top: '50%',
                                    scale: 1.5,
                                    opacity: 1
                                } : {
                                    top: '25%',
                                    scale: 1,
                                    opacity: 1
                                }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{
                                    duration: 1.5,
                                    ease: "easeInOut"
                                }}
                                style={{
                                    position: 'absolute',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    x: '-50%',
                                    y: '-50%',
                                    color: '#ffffff', // Plain white
                                    zIndex: 30,
                                    fontWeight: 700,
                                    textAlign: 'center',
                                    pointerEvents: 'none',
                                    textShadow: '0 0 20px rgba(0,0,0,0.8)' // Added shadow
                                }}
                            >
                                <span style={{ display: 'block', fontSize: '96px', lineHeight: 1 }}>{mortes}</span>
                                <span style={{ display: 'block', fontSize: '24px', opacity: 0.95, maxWidth: '700px', margin: '0 auto' }}>
                                    mortes por acidente de moto nesse ano
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Shadow Overlay to Contrast Text */}
                    <motion.div
                        animate={{
                            background: isFinale
                                ? 'radial-gradient(ellipse at center, rgba(0,0,0,0.9) 30%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0) 85%)'
                                : 'radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 80%)'
                        }}
                        transition={{ duration: 1.5 }}
                        style={{
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            width: '100%',
                            height: '100%',
                            zIndex: 15,
                            pointerEvents: 'none',
                        }}
                    />

                    {/* Text Section - Centered with Fade Transition */}
                    <div style={{
                        position: 'absolute',
                        top: '60%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '80%',
                        maxWidth: '600px',
                        zIndex: 20,
                        textAlign: 'center',
                        pointerEvents: 'none',
                        minHeight: '100px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <AnimatePresence mode='wait'>
                            {/* Show text only if NOT in finale, or let it fade out when isFinale becomes true */}
                            {!isFinale && textSections.length > 0 && activeSectionIndex < textSections.length && (
                                <motion.div
                                    key={activeSectionIndex}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.5 }}
                                    style={{
                                        color: '#ddd',
                                        fontSize: '1.6rem',
                                        lineHeight: 1.6,
                                        textShadow: '0 0 40px rgba(0,0,0,1)', // Strong diffuse shadow
                                        fontWeight: 500
                                    }}
                                >
                                    {formatSimText(textSections[activeSectionIndex])}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div ref={sceneRef} style={{ width: '100%', height: '100%' }} />

                    {/* Confirm Skip Modal */}
                    <AnimatePresence>
                        {showSkipConfirm && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                backgroundColor: 'rgba(0,0,0,0.8)',
                                zIndex: 100,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backdropFilter: 'blur(5px)'
                            }}>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    style={{
                                        backgroundColor: '#222',
                                        padding: '2rem',
                                        borderRadius: '8px',
                                        maxWidth: '400px',
                                        textAlign: 'center',
                                        border: '1px solid #444',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                                    }}
                                >
                                    <h3 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.2rem' }}>Pular Simulação?</h3>
                                    <p style={{ color: '#ccc', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                                        Ao pular, você perderá parte da narrativa apresentada durante a simulação. Tem certeza que deseja continuar?
                                    </p>
                                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                        <button
                                            onClick={cancelSkip}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '4px',
                                                border: '1px solid #555',
                                                backgroundColor: 'transparent',
                                                color: '#ccc',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={confirmSkip}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '4px',
                                                border: 'none',
                                                backgroundColor: theme.colors.simulation.progressBar,
                                                color: 'white',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Pular Mesmo Assim
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default MotoAccidentSimulation;

const ControlButton = ({ icon, tooltip, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div style={{ position: 'relative' }}>
            <motion.button
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.2)' }}
                whileTap={{ scale: 0.95 }}
                style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    cursor: 'pointer',
                    backdropFilter: 'blur(4px)'
                }}
            >
                {icon}
            </motion.button>
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            right: '100%',
                            marginRight: '8px',
                            transform: 'translateY(-50%)',
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none'
                        }}
                    >
                        {tooltip}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
