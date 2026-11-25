// Sonidos: cada uno está en su propio archivo y se genera por código (sin
// archivos de audio). Se reproducen con las utilidades de audio de three.js;
// los que tienen posición suenan en 3D: más fuerte cuanto más cerca está la
// cámara y por el lado en que ocurren.
import * as THREE from "three";
import { explosion } from "./explosion";
import { shot } from "./shot";
import { throwSound } from "./throw";
import { car } from "./car";
import { rebuild } from "./rebuild";

// Cada sonido define: volume y create(ctx) -> AudioBuffer.
// Para añadir uno nuevo basta con crear su archivo e incluirlo aquí.
const sounds = { explosion, shot, throw: throwSound, car, rebuild };

let listener = null;
let scene = null;
const buffers = {};

export function initAudio(camera, targetScene) {
  scene = targetScene;
  listener = new THREE.AudioListener();
  camera.add(listener);

  const ctx = listener.context;
  for (const [name, sound] of Object.entries(sounds)) {
    buffers[name] = sound.create(ctx);
  }

  // Los navegadores no dejan sonar nada hasta que el usuario interactúa
  const resume = () => {
    if (ctx.state === "suspended") ctx.resume();
  };
  window.addEventListener("pointerdown", resume);
  window.addEventListener("keydown", resume);
}

// Reproduce un sonido. Si se indica una posición, suena en 3D desde ese punto
export function playSound(name, position) {
  if (!listener || !buffers[name] || listener.context.state !== "running") return;

  let audio;
  if (position) {
    audio = new THREE.PositionalAudio(listener);
    audio.setRefDistance(6); // a esta distancia suena al volumen indicado
    audio.position.copy(position);
    scene.add(audio);
  } else {
    audio = new THREE.Audio(listener);
  }
  audio.setBuffer(buffers[name]);
  audio.setVolume(sounds[name].volume);
  audio.onEnded = () => {
    audio.isPlaying = false;
    if (audio.parent) audio.parent.remove(audio);
  };
  audio.play();
}