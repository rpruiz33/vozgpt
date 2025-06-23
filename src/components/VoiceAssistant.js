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
      // Corregida la URL para una búsqueda real en YouTube
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
    recognition.lang = 'es-ES'; // Asegura que el idioma sea español

    recognition.onstart = () => {
      setStatus('listening');
    };

    recognition.onerror = (event) => {
      console.error('Error de reconocimiento:', event.error);
      setStatus('error');
      let errorMessage = 'Error desconocido en el reconocimiento de voz.';
      if (event.error === 'not-allowed') {
        errorMessage = 'Acceso al micrófono denegado. Por favor, permite el uso del micrófono en la configuración de tu navegador.';
      } else if (event.error === 'no-speech') {
          errorMessage = 'No se detectó voz. Por favor, intenta hablar más claro o revisa tu micrófono.';
      }
      setConversation(prev => [...prev, {
        speaker: 'assistant',
        text: `Error de reconocimiento: ${errorMessage}`
      }]);
    };

    recognition.onend = () => {
      // Solo si el estado no es un error, vuelve a inactivo.
      // Si fue un error, el estado ya está en 'error'.
      if (status !== 'error') setStatus('inactive');
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      await processVoiceCommand(transcript);
    };

    recognitionRef.current = recognition;

    // Cleanup: detiene el reconocimiento cuando el componente se desmonta
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [status]); // Añadir 'status' al array de dependencias para que `onend` use el estado actual

  // Procesar comandos de voz
  const processVoiceCommand = async (command) => {
    if (!command.trim()) return;

    try {
      setStatus('processing');
      setConversation(prev => [...prev, { speaker: 'user', text: command }]);

      // Verificar si es un comando especial
      for (const [cmd, {action, response}] of Object.entries(COMMANDS)) {
        if (command.toLowerCase().includes(cmd)) {
          // Extraer la parte de la consulta si existe después del comando
          const query = command.toLowerCase().replace(cmd, '').trim();

          if (typeof action === 'function') { // Asegurarse de que 'action' es una función
            if (query) {
              action(query);
              const responseText = typeof response === 'function' ? response(query) : response;
              setConversation(prev => [...prev, { speaker: 'assistant', text: responseText }]);
              await speak(responseText);
              return;
            } else {
              action(); // Ejecutar acción sin query si no hay
              const responseText = typeof response === 'function' ? response('') : response; // Pasa un string vacío o usa el string directo
              setConversation(prev => [...prev, { speaker: 'assistant', text: responseText }]);
              await speak(responseText);
              return;
            }
          }
        }
      }

      // Si no es comando especial, consultar a la API de OpenAI
      const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}` // Asegúrate de tener tu clave API aquí
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
      const assistantText = data.choices[0]?.message?.content || "No pude generar una respuesta. Por favor, intenta de nuevo.";

      setConversation(prev => [...prev, { speaker: 'assistant', text: assistantText }]);
      await speak(assistantText);
    } catch (error) {
      console.error('Error al procesar comando o consultar OpenAI:', error);
      setStatus('error');
      setConversation(prev => [...prev, {
        speaker: 'assistant',
        text: `Lo siento, ocurrió un error: ${error.message}. Asegúrate de que tu clave de API de OpenAI sea correcta y tengas conexión a internet.`
      }]);
    } finally {
      setStatus('inactive');
    }
  };

  // Sintetizar voz
  const speak = (text) => {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        console.warn('SpeechSynthesis no está disponible en este navegador.');
        setStatus('inactive'); // Asegura que el estado vuelva a inactivo incluso si no puede hablar
        resolve(); // Resuelve la promesa para no bloquear la ejecución
        return;
      }

      setStatus('speaking');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        setStatus('inactive');
        resolve();
      };
      utterance.onerror = (event) => {
        console.error('Error en la síntesis de voz:', event.error);
        setStatus('error'); // Podrías cambiar a 'inactive' si prefieres no mostrar error persistente
        reject(`Error de voz: ${event.error}`); // Rechaza para que el catch lo maneje si es necesario
      };
      window.speechSynthesis.speak(utterance);
    });
  };

  // Controlar el reconocimiento de voz
  const toggleListening = () => {
    if (recognitionRef.current) { // Asegura que recognitionRef.current no es null
        if (status === 'listening') {
            recognitionRef.current.stop();
            setStatus('inactive');
        } else {
            // Detener cualquier síntesis de voz en curso antes de empezar a escuchar
            window.speechSynthesis.cancel(); 
            recognitionRef.current.start();
        }
    } else {
        console.error("El reconocimiento de voz no está inicializado.");
        setConversation(prev => [...prev, { speaker: 'assistant', text: 'El reconocimiento de voz no pudo iniciarse. Intenta recargar la página.' }]);
        setStatus('error');
    }
  };

  // Estilos en el componente (sin cambios, están bien)
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
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflowY: 'auto', // Permite scroll si hay muchos mensajes
      maxHeight: '400px' // Altura máxima para el scroll
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
      <style>{spinKeyframes}</style> {/* Incluye los keyframes */}

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
        disabled={status === 'processing' || status === 'speaking'} // Deshabilita el botón mientras procesa o habla
      >
        {status === 'listening' ? '🛑 Detener' : '🎤 Hablar'}
      </button>

      <div style={styles.conversation}>
        {conversation.length === 0 ? (
          <p style={{ color: '#757575', textAlign: 'center' }}>
            Di "Abrir ChatGPT", "Buscar en Google [tu consulta]" o haz una pregunta.
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