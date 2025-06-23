// App.js
import React from 'react';
// Importa el componente VoiceAssistant desde su archivo
import VoiceAssistant from './components/VoiceAssistant'; // ¡Aquí está el cambio!
// Si tienes un archivo CSS global para tu aplicación, impórtalo aquí
import './App.css'; 

const App = () => {
  return (
    <div className="app-container">
      {/* Simplemente renderiza el VoiceAssistant.
          Todo lo visual y funcional estará dentro de VoiceAssistant.js */}
      <VoiceAssistant />
    </div>
  );
};

export default App;