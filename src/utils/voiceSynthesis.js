export const speak = (text) => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject('Navegador no compatible con síntesis de voz');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(`Error de voz: ${event.error}`);

    window.speechSynthesis.speak(utterance);
  });
};