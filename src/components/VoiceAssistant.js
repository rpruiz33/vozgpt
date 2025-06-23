import React, { useState, useEffect, useRef, useCallback } from 'react';

const VoiceAssistant = () => {
  const [status, setStatus] = useState('inactive'); // inactive, listening, processing, speaking, error
  const [conversation, setConversation] = useState([]);
  const recognitionRef = useRef(null);

  // Comandos especiales y sus acciones
  const COMMANDS = {
    'abrir chatgpt': {
      action: () => {
        const url = 'https://chat.openai.com';
        console.log(`[COMMANDS] Ejecutando acción: Abrir URL ${url}`);
        window.open(url, '_blank');
      },
      response: "Abriendo ChatGPT en una nueva pestaña",
      aliases: ['abrir chat gt', 'abre chat gpt', 'abre chatgt', 'abrir gpt', 'abrir chat g p t'] // Añade más alias si encuentras otras transcripciones
    },
    'buscar en google': {
      action: (query) => {
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        console.log(`[COMMANDS] Ejecutando acción: Buscar en Google para "${query}", URL: ${url}`);
        window.open(url, '_blank');
      },
      response: (query) => `Buscando "${query}" en Google`,
      aliases: ['busca en google', 'búscame en google', 'buscar en googel']
    },
    'reproducir en youtube': {
      action: (query) => {
        // Asegúrate de que la URL de búsqueda de YouTube es correcta
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        console.log(`[COMMANDS] Ejecutando acción: Reproducir en YouTube para "${query}", URL: ${url}`);
        window.open(url, '_blank');
      },
      response: (query) => `Reproduciendo "${query}" en YouTube`,
      aliases: ['pon en youtube', 'reproduce en youtube', 'youtube']
    }
  };

  // Sintetizar voz
  const speak = useCallback((text) => {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        console.warn('[Speak] SpeechSynthesis no está disponible en este navegador.');
        setStatus('inactive');
        resolve();
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
        console.error('[Speak Error] Error en la síntesis de voz:', event.error);
        setStatus('error');
        reject(`Error de voz: ${event.error}`);
      };
      window.speechSynthesis.speak(utterance);
    });
  }, [setStatus]);

  // Procesar comandos de voz
  const processVoiceCommand = useCallback(async (command) => {
    if (!command.trim()) {
      console.log('[ProcessCommand] Comando de voz vacío o solo espacios.');
      return;
    }

    const cleanedCommand = command.toLowerCase().trim();
    console.log('[ProcessCommand] Comando de voz reconocido (original):', `"${command}"`);
    console.log('[ProcessCommand] Comando de voz limpio (minúsculas y trim):', `"${cleanedCommand}"`);
    setConversation(prev => [...prev, { speaker: 'user', text: command }]);

    try {
      setStatus('processing');

      let commandHandled = false; // Flag para saber si un comando especial fue manejado

      // Verificar si es un comando especial o uno de sus alias
      for (const [cmdKey, { action, response, aliases }] of Object.entries(COMMANDS)) {
        const potentialTriggers = [cmdKey, ...(aliases || [])]; // Incluye el cmdKey y todos sus aliases

        for (const trigger of potentialTriggers) {
          console.log(`[ProcessCommand] Intentando coincidir: "${cleanedCommand}" con potencial disparador: "${trigger}"`);
          if (cleanedCommand.includes(trigger)) {
            console.log(`[ProcessCommand] ¡Coincidencia encontrada! Comando especial "${cmdKey}" (activado por "${trigger}") detectado.`);
            commandHandled = true;

            // Extrae la parte de la consulta DESPUÉS del disparador que coincidió
            const query = cleanedCommand.replace(trigger, '').trim();

            // Lógica específica para "abrir chatgpt" para asegurar que no tenga texto extra
            if (cmdKey === 'abrir chatgpt') {
                if (query) {
                    const responseText = `Para abrir ChatGPT, por favor di solo "Abrir ChatGPT" o una frase similar sin añadir más texto. Dijiste: "${command}"`;
                    setConversation(prev => [...prev, { speaker: 'assistant', text: responseText }]);
                    await speak(responseText);
                    return; // Sale para no ir a OpenAI
                } else {
                    action(); // Ejecuta la acción directa de abrir ChatGPT
                    const responseText = typeof response === 'function' ? response('') : response;
                    setConversation(prev => [...prev, { speaker: 'assistant', text: responseText }]);
                    await speak(responseText);
                    return; // Sale de la función
                }
            }
            // Para otros comandos como buscar/reproducir, la 'query' es esperada
            else {
                action(query);
                const responseText = typeof response === 'function' ? response(query) : response;
                setConversation(prev => [...prev, { speaker: 'assistant', text: responseText }]);
                await speak(responseText);
                return; // Sale de la función
            }
          }
        }
      }

      // Si ningún comando especial fue manejado, consulta a la API de OpenAI
      if (!commandHandled) {
        console.log('[ProcessCommand] No se detectó un comando especial. Consultando a OpenAI...');

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

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            console.error('[OpenAI API Error] HTTP Status:', apiResponse.status, 'Error Data:', errorData);
            let apiErrorMessage = `Error de la API de OpenAI: ${apiResponse.status}`;
            if (errorData.error && errorData.error.message) {
                apiErrorMessage += ` - ${errorData.error.message}`;
            }
            throw new Error(apiErrorMessage); // Lanza un error para ser capturado por el catch
        }

        const data = await apiResponse.json();
        const assistantText = data?.choices?.[0]?.message?.content || "No pude generar una respuesta de la IA. Por favor, intenta de nuevo.";

        setConversation(prev => [...prev, { speaker: 'assistant', text: assistantText }]);
        await speak(assistantText);
      }

    } catch (error) {
      console.error('[General Error] Error al procesar comando o consultar OpenAI:', error);
      setStatus('error');
      let userErrorMessage = 'Lo siento, ocurrió un error inesperado.';
      if (error.message.includes('Failed to fetch')) {
        userErrorMessage = 'Error de conexión a internet o la API de OpenAI no está accesible.';
      } else if (error.message.includes('401 Unauthorized')) {
        userErrorMessage = 'Error de autenticación: Tu clave de API de OpenAI podría ser incorrecta o no válida. Por favor, revísala en el archivo .env y reinicia el servidor.';
      } else if (error.message.includes('429 Too Many Requests')) {
        userErrorMessage = 'Has excedido tu cuota de uso de la API de OpenAI. Intenta más tarde o verifica tu plan de facturación en la plataforma de OpenAI.';
      } else {
        userErrorMessage = `Lo siento, ocurrió un error: ${error.message}`;
      }

      setConversation(prev => [...prev, {
        speaker: 'assistant',
        text: userErrorMessage
      }]);
    } finally {
      if (status !== 'error') {
        setStatus('inactive');
      }
    }
  }, [setConversation, setStatus, speak, COMMANDS, status]);

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
      console.log('[Recognition] Reconocimiento de voz iniciado.');
    };

    recognition.onerror = (event) => {
      console.error('[Recognition Error] Error de reconocimiento:', event.error);
      let errorMessage = 'Error desconocido en el reconocimiento de voz.';
      if (event.error === 'not-allowed') {
        errorMessage = 'Acceso al micrófono denegado. Por favor, permite el uso del micrófono en la configuración de tu navegador.';
        setStatus('error');
      } else if (event.error === 'no-speech') {
          errorMessage = 'No se detectó voz. Por favor, intenta hablar más claro o revisa tu micrófono.';
          setStatus('inactive');
          console.log('[Recognition] Reconocimiento de voz detenido por no-speech.');
      } else if (event.error === 'audio-capture') {
          errorMessage = 'No se pudo capturar audio del micrófono.';
          setStatus('error');
      } else if (event.error === 'network') {
          errorMessage = 'Error de red en el servicio de reconocimiento de voz.';
          setStatus('error');
      } else {
          setStatus('error');
      }

      if (event.error !== 'no-speech') {
        setConversation(prev => [...prev, {
          speaker: 'assistant',
          text: `Error de reconocimiento: ${errorMessage}`
        }]);
      }
    };

    recognition.onend = () => {
      if (status !== 'error') {
          setStatus('inactive');
          console.log('[Recognition] Reconocimiento de voz finalizado.');
      } else {
          console.log('[Recognition] Reconocimiento de voz finalizado, pero el estado permanece en error.');
      }
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      console.log('[Recognition] Transcripción obtenida:', `"${transcript}"`);
      await processVoiceCommand(transcript);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        console.log('[Recognition] Reconocimiento de voz detenido por limpieza del componente.');
      }
    };
  }, [status, processVoiceCommand, setConversation]);

  // Controlar el reconocimiento de voz
  const toggleListening = () => {
    if (recognitionRef.current) {
        if (status === 'listening') {
            recognitionRef.current.stop();
            setStatus('inactive');
            console.log('[Toggle] Deteniendo reconocimiento por botón.');
        } else {
            window.speechSynthesis.cancel();
            recognitionRef.current.start();
            console.log('[Toggle] Iniciando reconocimiento por botón.');
        }
    } else {
        console.error("[Toggle] El reconocimiento de voz no está inicializado.");
        setConversation(prev => [...prev, { speaker: 'assistant', text: 'El reconocimiento de voz no pudo iniciarse. Intenta recargar la página.' }]);
        setStatus('error');
    }
  };

  // Estilos en el componente (sin cambios)
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
      overflowY: 'auto',
      maxHeight: '400px'
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
        disabled={status === 'processing' || status === 'speaking'}
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