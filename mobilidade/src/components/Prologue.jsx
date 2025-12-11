import React from 'react';

const Prologue = ({ content }) => {
    // Parse simple markdown-like content from the string
    // Expected format:
    // ## Title
    // Text...

    let title = "";
    let text = "";

    if (content) {
        const lines = content.split('\n');
        lines.forEach(line => {
            if (line.trim().startsWith('##')) {
                title = line.replace(/^##+\s*/, '').trim();
            } else if (line.trim()) {
                text += line.trim() + " ";
            }
        });
    }

    return (
        <div className="bg-zone" data-opacity="1" data-color="#000" style={{ minHeight: '100vh', height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', margin: 0, padding: 0 }}>
            {/* Prologue Content - Text Only */}
            <div style={{ maxWidth: '600px', textAlign: 'center', color: '#fff', padding: '2rem', pointerEvents: 'auto' }}>
                {title && <h3 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{title}</h3>}
                <p style={{ fontSize: '1.2rem', lineHeight: '1.6' }}>{text}</p>
            </div>
        </div>
    );
};

export default Prologue;
