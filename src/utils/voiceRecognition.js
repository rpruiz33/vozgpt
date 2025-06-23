export const startVoiceRecognition = ({ onStart, onEnd, onError, onResult }) => {
  if (!('webkitSpeechRecognition' in window)) {
    onError('Navegador no compatible con reconocimiento de voz');
    return () => {};
  }

  const recognition = new window.webkitSpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'es-ES';

  recognition.onstart = () => {
    onStart();
  };

  recognition.onend = () => {
    onEnd();
    setTimeout(() => recognition.start(), 500);
  };

  recognition.onerror = (event) => {
    let errorMessage = 'Error desconocido';
    switch(event.error) {
      case 'no-speech':
        errorMessage = 'No se detectó voz';
        break;
      case 'audio-capture':
        errorMessage = 'No se pudo capturar audio';
        break;
      case 'not-allowed':
        errorMessage = 'Permiso de micrófono denegado';
        break;
      default:
        errorMessage = `Error: ${event.error}`;
    }
    onError(errorMessage);
  };

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    onResult(transcript.trim());
  };

  // Solicitar permisos y comenzar
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(() => recognition.start())
    .catch(() => onError('Permiso de micrófono denegado'));

  // Función de limpieza
  return () => {
    recognition.abort();
  };
};