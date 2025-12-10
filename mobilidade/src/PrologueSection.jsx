import React from 'react';
import { narrativeData } from './narrativeData';

const PrologueSection = ({ transparent = false }) => {
    return (
        <div className="bg-zone" data-opacity="1" data-color="#000" style={{ minHeight: '100vh', height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, backgroundColor: transparent ? 'transparent' : '#000', margin: 0, padding: 0, pointerEvents: 'auto' }}>
            {/* Prologue Content - Text Only */}
            <div style={{ maxWidth: '600px', textAlign: 'center', color: '#fff', padding: '2rem' }}>
                <h3 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{narrativeData.prologue.title}</h3>
                <p style={{ fontSize: '1.2rem', lineHeight: '1.6' }}>{narrativeData.prologue.text}</p>
            </div>
        </div>
    );
};

export default PrologueSection;
