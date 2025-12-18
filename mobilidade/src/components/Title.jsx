import React from 'react';
import { theme } from '../theme';

const Title = ({ content, forwardRef }) => {
    // Content is expected to be the title text
    // Parser returns array of args, take first one or join
    const text = Array.isArray(content) ? content.join(' ') : (content || "Título");

    return (
        <div 
            className="bg-zone" 
            data-opacity="1" 
            data-color="#fff" 
            style={
                {   minWidth: '40%',
                    maxWidth: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'flex-start',
                    minHeight: 'clamp(30vh, 40vh, 70vh)',
                    /*paddingInline: 'clamp(1rem, 4vw, 3rem)',*/
                    boxSizing: 'border-box'
                }
            }>
            <div
                className="section"
                style={
                    { zIndex: 1, 
                        position: 'relative', 
                        /*minWidth: '80vw', */
                        textAlign: 'center' 
                    }
                }
            >
                <h1 
                    ref={forwardRef} 
                    style={
                        { fontSize: 'clamp(2rem, 8vw, 4rem)',
                            whiteSpace: 'nowrap',
                            color: theme.colors.narrative.title,
                            pointerEvents: 'auto',
                            lineHeight: '1.1',
                            textAlign: 'center' 
                        }
                    }>{text}</h1>

                {/* Diverging Start Points (Invisible) */}
                <div id="line-start-blue" style={{ position: 'absolute', top: '15vh', left: '35%', height: '10px', width: '10px' }} />
                <div id="line-start-orange" style={{ position: 'absolute', top: '15vh', left: '65%', height: '10px', width: '10px' }} />
            </div>
        </div>
    );
};

export default Title;
