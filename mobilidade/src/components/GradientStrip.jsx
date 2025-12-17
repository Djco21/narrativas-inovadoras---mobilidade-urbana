import '../App.css';

const GradientStrip = ({ height = '300px', top = '0', topEdge = 'soft', bottomEdge = 'soft', fadeHeight = '40px', style = {}, ...props }) => {

    const getGradient = () => {
        const stops = [];

        // Top Edge
        if (topEdge === 'soft') {
            stops.push('rgba(255, 255, 255, 0) 0px');
            stops.push(`rgba(255, 255, 255, 1) ${fadeHeight}`);
        } else { // hard
            stops.push('rgba(255, 255, 255, 1) 0px');
        }

        // Bottom Edge
        if (bottomEdge === 'soft') {
            stops.push(`rgba(255, 255, 255, 1) calc(100% - ${fadeHeight})`);
            stops.push('rgba(255, 255, 255, 0) 100%');
        } else { // hard
            stops.push('rgba(255, 255, 255, 1) 100%');
        }

        return `linear-gradient(to bottom, ${stops.join(', ')})`;
    };

    return (
        <div
            className="gradient-strip"
            style={{
                height,
                top,
                background: getGradient(),
                ...style
            }}
            {...props}
        />
    );
};

export default GradientStrip;
