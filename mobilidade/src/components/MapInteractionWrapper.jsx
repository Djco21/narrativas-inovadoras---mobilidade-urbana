import React from 'react';

const MapInteractionWrapper = ({ children, onBlock, onUnblock }) => {
    // Clone the child element to inject event handlers without adding an extra DOM node
    return React.cloneElement(children, {
        onMouseEnter: (e) => {
            if (onBlock) onBlock();
            if (children.props.onMouseEnter) children.props.onMouseEnter(e);
        },
        onMouseLeave: (e) => {
            if (onUnblock) onUnblock();
            if (children.props.onMouseLeave) children.props.onMouseLeave(e);
        }
    });
};

export default MapInteractionWrapper;
