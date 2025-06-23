import React from 'react';
// Asegúrate de que esta ruta sea correcta según tu estructura de carpetas:
import VoiceAssistant from './components/VoiceAssistant'; // Si VoiceAssistant.js está en src/components

// Si tienes un archivo CSS global para tu aplicación, impórtalo aquí
import './App.css';

const App = () => {
  return (
    <div className="app-container">
      {/* Simplemente renderiza el VoiceAssistant. */}
      <VoiceAssistant />
    </div>
  );
};

export default App;