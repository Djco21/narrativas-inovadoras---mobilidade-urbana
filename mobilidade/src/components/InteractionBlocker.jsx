import React from 'react';
import { useMapInteraction } from './MapInteractionContext';

const InteractionBlocker = ({ children }) => {
    const { setInteractionBlocked } = useMapInteraction();

    // Clone the child element to inject event handlers without adding an extra DOM node
    return React.cloneElement(children, {
        onMouseEnter: (e) => {
            setInteractionBlocked(true);
            if (children.props.onMouseEnter) children.props.onMouseEnter(e);
        },
        onMouseLeave: (e) => {
            setInteractionBlocked(false);
            if (children.props.onMouseLeave) children.props.onMouseLeave(e);
        }
    });
};

export default InteractionBlocker;
