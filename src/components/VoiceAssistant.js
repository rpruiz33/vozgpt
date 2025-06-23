import React, { useState, useEffect, useRef, useCallback } from 'react';

// 🔹 Mover el objeto COMMANDS afuera del componente
const COMMANDS = {
  'abrir chatgpt': {
    action: () => {
      const url = 'https://chat.openai.com';
      window.open(url, '_blank');
    },
    response: "Abriendo ChatGPT en una nueva pestaña",
    aliases: ['abrir chat gt', 'abre chat gpt', 'abre chatgt', 'abrir gpt', 'abrir chat g p t']
  },
  'buscar en google': {
    action: (query) => {
      const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      window.open(url, '_blank');
    },
    response: (query) => `Buscando "${query}" en Google`,
    aliases: ['busca en google', 'búscame en google', 'buscar en googel']
  },
  'reproducir en youtube': {
    action: (query) => {
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      window.open(url, '_blank');
    },
    response: (query) => `Reproduciendo "${query}" en YouTube`,
    aliases: ['pon en youtube', 'reproduce en youtube', 'youtube']
  }
};

const VoiceAssistant = () => {
  const [status, setStatus] = useState('inactive'); // inactive, listening, processing, speaking, error
  const [conversation, setConversation] = useState([]);
  const recognitionRef = useRef(null);

  const speak = useCallback((text) => {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
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
        setStatus('error');
        reject(`Error de voz: ${event.error}`);
      };
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const processVoiceCommand = useCallback(async (command) => {
    if (!command.trim()) return;

    const cleanedCommand = command.toLowerCase().trim();
    setConversation(prev => [...prev, { speaker: 'user', text: command }]);
    try {
      setStatus('processing');
      let handled = false;

      for (const [cmdKey, { action, response, aliases }] of Object.entries(COMMANDS)) {
        const triggers = [cmdKey, ...(aliases || [])];
        for (const trigger of triggers) {
          if (cleanedCommand.includes(trigger)) {
            handled = true;
            const query = cleanedCommand.replace(trigger, '').trim();
            if (cmdKey === 'abrir chatgpt') {
              if (query) {
                const text = `Para abrir ChatGPT, por favor di solo "Abrir ChatGPT". Dijiste: "${command}"`;
                setConversation(prev => [...prev, { speaker: 'assistant', text }]);
                await speak(text);
                return;
              } else {
                action();
                const text = typeof response === 'function' ? response('') : response;
                setConversation(prev => [...prev, { speaker: 'assistant', text }]);
                await speak(text);
                return;
              }
            } else {
              action(query);
              const text = typeof response === 'function' ? response(query) : response;
              setConversation(prev => [...prev, { speaker: 'assistant', text }]);
              await speak(text);
              return;
            }
          }
        }
      }

      if (!handled) {
        const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: command }],
            temperature: 0.7,
            max_tokens: 200
          })
        });

        if (!apiResponse.ok) {
          const errorData = await apiResponse.json();
          let msg = `Error de API OpenAI: ${apiResponse.status}`;
          if (errorData.error?.message) msg += ` - ${errorData.error.message}`;
          throw new Error(msg);
        }

        const data = await apiResponse.json();
        const assistantText = data.choices?.[0]?.message?.content || "No se pudo generar una respuesta.";
        setConversation(prev => [...prev, { speaker: 'assistant', text: assistantText }]);
        await speak(assistantText);
      }

    } catch (error) {
      const msg = error.message.includes('Failed to fetch') ?
        'Error de conexión o API de OpenAI inaccesible.' :
        error.message;
      setConversation(prev => [...prev, { speaker: 'assistant', text: msg }]);
      setStatus('error');
    } finally {
      if (status !== 'error') setStatus('inactive');
    }
  }, [speak, status]);

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

    recognition.onstart = () => setStatus('listening');
    recognition.onerror = (e) => {
      setStatus('error');
      setConversation(prev => [...prev, { speaker: 'assistant', text: `Error: ${e.error}` }]);
    };
    recognition.onend = () => setStatus('inactive');
    recognition.onresult = async (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript;
      await processVoiceCommand(transcript);
    };

    recognitionRef.current = recognition;

    return () => recognitionRef.current?.stop();
  }, [processVoiceCommand]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (status === 'listening') {
      recognitionRef.current.stop();
      setStatus('inactive');
    } else {
      window.speechSynthesis.cancel();
      recognitionRef.current.start();
    }
  };

  const styles = {
    container: { maxWidth: 800, margin: 'auto', padding: 20, fontFamily: 'sans-serif' },
    status: { margin: '10px 0', fontWeight: 'bold' },
    conversation: { border: '1px solid #ccc', padding: 10, borderRadius: 5, minHeight: 200 },
    button: {
      margin: '20px 0',
      padding: '10px 20px',
      fontSize: 16,
      backgroundColor: status === 'listening' ? '#d32f2f' : '#1976d2',
      color: 'white',
      border: 'none',
      borderRadius: 5,
      cursor: 'pointer'
    },
    message: { marginBottom: 10 },
    user: { color: '#0d47a1' },
    assistant: { color: '#2e7d32' }
  };

  return (
    <div style={styles.container}>
      <h1>Asistente de Voz</h1>
      <div style={styles.status}>Estado: {status}</div>
      <button style={styles.button} onClick={toggleListening}>
        {status === 'listening' ? '🛑 Detener' : '🎤 Hablar'}
      </button>
      <div style={styles.conversation}>
        {conversation.map((msg, i) => (
          <div key={i} style={styles.message}>
            <strong style={msg.speaker === 'user' ? styles.user : styles.assistant}>
              {msg.speaker === 'user' ? 'Tú: ' : 'Asistente: '}
            </strong>
            {msg.text}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VoiceAssistant;
