import React from 'react';
import MotoAccidentSimulation from './components/MotoAccidentSimulation';

// Example component for testing
const TestComponent = () => (
    <div style={{
        padding: '2rem',
        background: 'rgba(255, 100, 100, 0.2)',
        border: '1px solid red',
        textAlign: 'center',
        margin: '2rem 0',
        color: '#fff'
    }}>
        <h3>Teste de Componente Injetado</h3>
        <p>Este componente foi renderizado dinamicamente via Markdown.</p>
    </div>
);

export const componentRegistry = {
    'test-component': TestComponent,
    'moto-accident-simulation': MotoAccidentSimulation,
    // Add future components here
};
