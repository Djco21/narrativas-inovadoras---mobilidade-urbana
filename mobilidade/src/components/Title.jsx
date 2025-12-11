import React from 'react';
import { theme } from '../theme';

const Title = ({ content, forwardRef }) => {
    // Content is expected to be the title text
    const text = content || "Título";

    return (
        <div className="bg-zone" data-opacity="1" data-color="#fff" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minHeight: '50vh' }}>
            <div
                className="section"
                style={{ zIndex: 1, position: 'relative', minWidth: '80vw', textAlign: 'center' }}
            >
                <h1 ref={forwardRef} style={{ fontSize: '4rem', whiteSpace: 'nowrap', color: theme.colors.narrative.title }}>{text}</h1>

                {/* Diverging Start Points (Invisible) */}
                <div id="line-start-blue" style={{ position: 'absolute', top: '15vh', left: '35%', height: '10px', width: '10px' }} />
                <div id="line-start-orange" style={{ position: 'absolute', top: '15vh', left: '65%', height: '10px', width: '10px' }} />
            </div>
        </div>
    );
};

export default Title;
