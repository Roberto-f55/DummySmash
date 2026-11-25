// Utilidades para generar sonidos muestra a muestra

// Crea un buffer de audio de "seconds" segundos. "sample(t, state)" devuelve
// el valor (entre -1 y 1) de cada muestra en el instante t
export function createBuffer(ctx, seconds, sample) {
    const rate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, Math.floor(seconds * rate), rate);
    const data = buffer.getChannelData(0);
    const state = {}; // para que cada sonido guarde sus filtros entre muestras
    for (let i = 0; i < data.length; i++) {
      data[i] = sample(i / rate, state);
    }
    return buffer;
  }
  
  // Ruido blanco
  export const noise = () => Math.random() * 2 - 1;
  
  // Filtro paso bajo de un polo: suaviza el ruido (cuanto menor "k", más grave)
  export function lowpass(state, key, input, k) {
    state[key] = (state[key] || 0) + k * (input - (state[key] || 0));
    return state[key];
  }