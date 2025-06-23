import React, { useState, useEffect } from 'react';
import { startVoiceRecognition } from '../utils/voiceRecognition';
import { speak } from '../utils/voiceSynthesis';

const VoiceAssistant = () => {
  const [status, setStatus] = useState('INICIANDO');
  const [error, setError] = useState(null);
  const [conversation, setConversation] = useState([]);

  useEffect(() => {
    const handleVoiceCommand = async (command) => {
      try {
        setStatus('PROCESANDO');
        // Aquí iría tu llamada a la API de ChatGPT
        const response = `Respuesta a: "${command}"`;
        setConversation(prev => [...prev, 
          { speaker: 'user', text: command },
          { speaker: 'assistant', text: response }
        ]);
        await speak(response);
        setStatus('ESCUCHANDO');
      } catch (err) {
        setError(err.message);
        setStatus('ERROR');
      }
    };

    const cleanup = startVoiceRecognition({
      onStart: () => setStatus('ESCUCHANDO'),
      onEnd: () => setStatus('INACTIVO'),
      onError: (err) => {
        setError(err);
        setStatus('ERROR');
      },
      onResult: handleVoiceCommand
    });

    return cleanup;
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Asistente por Voz</h1>
      <div style={styles.statusContainer}>
        <p>Estado: <strong>{status}</strong></p>
        {error && <p style={styles.error}>{error}</p>}
      </div>
      <div style={styles.conversation}>
        {conversation.map((item, index) => (
          <p key={index} style={item.speaker === 'user' ? styles.user : styles.assistant}>
            <strong>{item.speaker === 'user' ? 'Tú: ' : 'Asistente: '}</strong>
            {item.text}
          </p>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  },
  title: {
    textAlign: 'center',
    color: '#333'
  },
  statusContainer: {
    backgroundColor: '#f0f0f0',
    padding: '10px',
    borderRadius: '5px',
    margin: '20px 0'
  },
  error: {
    color: 'red',
    fontWeight: 'bold'
  },
  conversation: {
    marginTop: '30px'
  },
  user: {
    color: '#0066cc',
    margin: '5px 0'
  },
  assistant: {
    color: '#009933',
    margin: '5px 0',
    paddingLeft: '20px'
  }
};

export default VoiceAssistant;