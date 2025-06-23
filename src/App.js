import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  const [status, setStatus] = useState('INICIANDO');
  const [message, setMessage] = useState('');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');

  // Función para simular el reconocimiento de voz
  const simulateVoiceRecognition = () => {
    setStatus('ESCUCHANDO');
    setMessage('Habla ahora...');

    // Simular un comando de voz después de 3 segundos
    setTimeout(() => {
      const fakeCommand = "Abrir ChatGPT";
      setTranscript(fakeCommand);
      processVoiceCommand(fakeCommand);
    }, 3000);
  };

  // Función para procesar comandos de voz
  const processVoiceCommand = (command) => {
    setStatus('PROCESANDO');
    setMessage('Procesando tu solicitud...');

    // Simular respuesta de ChatGPT después de 2 segundos
    setTimeout(() => {
      setResponse(`Hola, soy ChatGPT. Recibí tu comando: "${command}"`);
      setStatus('LISTO');
      setMessage('Listo para recibir más comandos');
    }, 2000);
  };

  useEffect(() => {
  // Definir la función dentro del useEffect
  const simulateVoiceRecognition = () => {
    setStatus('ESCUCHANDO');
    setMessage('Habla ahora...');

    setTimeout(() => {
      const fakeCommand = "Abrir ChatGPT";
      setTranscript(fakeCommand);
      processVoiceCommand(fakeCommand);
    }, 3000);
  };

  // Simular inicio de la aplicación
  setTimeout(() => {
    setStatus('LISTO');
    setMessage('Aplicación cargada correctamente');
    
    setTimeout(simulateVoiceRecognition, 2000);
  }, 1500);
}, []); // Ahora el array de dependencias está vacío correctamente
  return (
    <div className="app-container">
      <h1 className="app-title">ChatGPT por Voz</h1>
      
      <div className="status-box">
        <p className="status-text">
          <strong>Estado:</strong> {status}
        </p>
        
        {message && <p className="message-text">{message}</p>}
        
        {transcript && (
          <div className="transcript-box">
            <p><strong>Comando detectado:</strong></p>
            <p>"{transcript}"</p>
          </div>
        )}
        
        {response && (
          <div className="response-box">
            <p><strong>Respuesta:</strong></p>
            <p>"{response}"</p>
          </div>
        )}
      </div>
      
      <button 
        className="voice-button"
        onClick={simulateVoiceRecognition}
      >
        {status === 'ESCUCHANDO' ? 'Escuchando...' : 'Iniciar Reconocimiento de Voz'}
      </button>
    </div>
  );
};

export default App;