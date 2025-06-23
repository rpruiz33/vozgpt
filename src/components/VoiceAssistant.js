import React, { useState, useEffect, useRef } from 'react';

const VoiceAssistant = () => {
  const [status, setStatus] = useState('inactive'); // inactive, listening, processing, speaking, error
  const [conversation, setConversation] = useState([]);
  const recognitionRef = useRef(null);

  // Comandos especiales y sus acciones
  const COMMANDS = {
    'abrir chatgpt': {
      action: () => window.open('https://chat.openai.com', '_blank'),
      response: "Abriendo ChatGPT en una nueva pestaña"
    },
    'buscar en google': {
      action: (query) => window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank'),
      response: (query) => `Buscando "${query}" en Google`
    },
    'reproducir en youtube': {
      action: (query) => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, '_blank'),
      response: (query) => `Reproduciendo "${query}" en YouTube`
    }
  };

  // Inicializar reconocimiento de voz
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setStatus('error');
      setConversation([{ speaker: 'assistant', text: 'Tu navegador no soporta reconocimiento de voz' }]);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'es-ES';

    recognition.onstart = () => {
      setStatus('listening');
    };

    recognition.onerror = (event) => {
      console.error('Error de reconocimiento:', event.error);
      setStatus('error');
      setConversation(prev => [...prev, {
        speaker: 'assistant',
        text: `Error de reconocimiento: ${event.error}`
      }]);
    };

    recognition.onend = () => {
      if (status !== 'error') setStatus('inactive');
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      await processVoiceCommand(transcript);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Procesar comandos de voz
  const processVoiceCommand = async (command) => {
    if (!command.trim()) return;

    try {
      setStatus('processing');
      setConversation(prev => [...prev, { speaker: 'user', text: command }]);

      // Verificar si es un comando especial
      for (const [cmd, {action, response}] of Object.entries(COMMANDS)) {
        if (command.toLowerCase().includes(cmd)) {
          const query = command.replace(cmd, '').trim();
          
          if (query) {
            action(query);
            const responseText = typeof response === 'function' ? response(query) : response;
            setConversation(prev => [...prev, { speaker: 'assistant', text: responseText }]);
            await speak(responseText);
            return;
          } else {
            action();
            setConversation(prev => [...prev, { speaker: 'assistant', text: response }]);
            await speak(response);
            return;
          }
        }
      }

      // Si no es comando especial, consultar a la API de OpenAI
      const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{
            role: "user",
            content: command
          }],
          temperature: 0.7,
          max_tokens: 200
        })
      });

      const data = await apiResponse.json();
      const assistantText = data.choices[0]?.message?.content || "No pude generar una respuesta";

      setConversation(prev => [...prev, { speaker: 'assistant', text: assistantText }]);
      await speak(assistantText);
    } catch (error) {
      console.error('Error:', error);
      setStatus('error');
      setConversation(prev => [...prev, {
        speaker: 'assistant',
        text: `Lo siento, ocurrió un error: ${error.message}`
      }]);
    } finally {
      setStatus('inactive');
    }
  };

  // Sintetizar voz
  const speak = (text) => {
    return new Promise((resolve) => {
      setStatus('speaking');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.onend = () => {
        setStatus('inactive');
        resolve();
      };
      window.speechSynthesis.speak(utterance);
    });
  };

  // Controlar el reconocimiento de voz
  const toggleListening = () => {
    if (status === 'listening') {
      recognitionRef.current.stop();
      setStatus('inactive');
    } else {
      recognitionRef.current.start();
    }
  };

  // Estilos en el componente
  const styles = {
    container: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f9f9f9',
      borderRadius: '10px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    },
    title: {
      textAlign: 'center',
      color: '#333',
      marginBottom: '30px'
    },
    status: {
      padding: '10px 15px',
      borderRadius: '20px',
      display: 'inline-block',
      marginBottom: '20px',
      fontWeight: 'bold',
      backgroundColor: '#f0f0f0'
    },
    statusListening: {
      backgroundColor: '#e8f5e9',
      color: '#2e7d32'
    },
    statusProcessing: {
      backgroundColor: '#fff8e1',
      color: '#ff8f00'
    },
    statusSpeaking: {
      backgroundColor: '#e3f2fd',
      color: '#1565c0'
    },
    statusError: {
      backgroundColor: '#ffebee',
      color: '#c62828'
    },
    button: {
      backgroundColor: '#4285f4',
      color: 'white',
      border: 'none',
      padding: '12px 24px',
      fontSize: '16px',
      borderRadius: '50px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      margin: '0 auto 30px',
      transition: 'all 0.3s'
    },
    buttonActive: {
      backgroundColor: '#db4437'
    },
    conversation: {
      marginTop: '30px',
      minHeight: '300px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    message: {
      marginBottom: '15px',
      padding: '12px',
      borderRadius: '8px',
      lineHeight: '1.5'
    },
    userMessage: {
      backgroundColor: '#e3f2fd',
      marginLeft: '20%',
      borderBottomRightRadius: '0'
    },
    assistantMessage: {
      backgroundColor: '#f1f1f1',
      marginRight: '20%',
      borderBottomLeftRadius: '0'
    },
    speaker: {
      display: 'block',
      marginBottom: '5px',
      color: '#333',
      fontWeight: 'bold'
    },
    processing: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      margin: '10px 0',
      padding: '10px',
      background: '#fff3e0',
      borderRadius: '8px'
    },
    spinner: {
      width: '20px',
      height: '20px',
      border: '3px solid rgba(0,0,0,0.1)',
      borderRadius: '50%',
      borderTopColor: '#ff9800',
      animation: 'spin 1s ease-in-out infinite'
    }
  };

  // Animación para el spinner
  const spinKeyframes = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  return (
    <div style={styles.container}>
      <style>{spinKeyframes}</style>
      
      <h1 style={styles.title}>Asistente de Voz ChatGPT</h1>
      
      <div style={{
        ...styles.status,
        ...(status === 'listening' && styles.statusListening),
        ...(status === 'processing' && styles.statusProcessing),
        ...(status === 'speaking' && styles.statusSpeaking),
        ...(status === 'error' && styles.statusError)
      }}>
        Estado: {{
          inactive: 'Listo',
          listening: 'Escuchando...',
          processing: 'Procesando...',
          speaking: 'Hablando...',
          error: 'Error'
        }[status]}
      </div>

      <button 
        onClick={toggleListening}
        style={{
          ...styles.button,
          ...(status === 'listening' && styles.buttonActive)
        }}
      >
        {status === 'listening' ? '🛑 Detener' : '🎤 Hablar'}
      </button>

      <div style={styles.conversation}>
        {conversation.length === 0 ? (
          <p style={{ color: '#757575', textAlign: 'center' }}>
            Di "Abrir ChatGPT" o haz una pregunta
          </p>
        ) : (
          conversation.map((msg, index) => (
            <div 
              key={index} 
              style={{
                ...styles.message,
                ...(msg.speaker === 'user' ? styles.userMessage : styles.assistantMessage)
              }}
            >
              <span style={styles.speaker}>
                {msg.speaker === 'user' ? 'Tú:' : 'Asistente:'}
              </span>
              <p>{msg.text}</p>
            </div>
          ))
        )}

        {status === 'processing' && (
          <div style={styles.processing}>
            <div style={styles.spinner}></div>
            <p>Procesando tu mensaje...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceAssistant;