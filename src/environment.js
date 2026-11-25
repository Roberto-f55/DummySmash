// Escenario: suelo (dividido en baldosas que la bomba puede arrancar) y
// pórtico estático del que cuelga el muñeco
import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { createBoxWithPhysics, removeObject } from "./physics";
import { createTween } from "./animation";

// Altura de la viga superior (el muñeco se cuelga de ella)
export const BEAM_Y = 4.5;
export let beamBody; // cuerpo físico de la viga

// Suelo: 40 x 40 metros en baldosas de 4 x 4
const GROUND_SIZE = 40;
const TILE_SIZE = 4;
const TILE_THICKNESS = 1;
const TILE_MASS = 40; // masa de cada baldosa cuando sale volando

// Animación de reconstrucción del suelo
const RISE_FROM = -12; // las baldosas suben desde esta altura
const RISE_TIME = 700; // milisegundos que tarda cada baldosa en subir
const WAVE_DELAY = 45; // milisegundos de retraso por cada metro desde el centro

let groundMaterial;
let tiles = []; // baldosas del suelo (estáticas o volando)
let tileTweens = []; // animaciones de las baldosas en curso

export function createEnvironment() {
  createGround();
  createGallows();
}

// ---------------------------------------------------------------------------
// Suelo
// ---------------------------------------------------------------------------
function createGround() {
  if (!groundMaterial) {
    groundMaterial = new THREE.MeshPhongMaterial({ map: createGridTexture() });
  }
  const quat = new THREE.Quaternion(0, 0, 0, 1);
  const half = GROUND_SIZE / 2;
  for (let x = -half + TILE_SIZE / 2; x < half; x += TILE_SIZE) {
    for (let z = -half + TILE_SIZE / 2; z < half; z += TILE_SIZE) {
      tiles.push(createTile(new THREE.Vector3(x, -TILE_THICKNESS / 2, z), quat, 0));
    }
  }
}

function createTile(pos, quat, mass) {
  const tile = createBoxWithPhysics(
    TILE_SIZE,
    TILE_THICKNESS,
    TILE_SIZE,
    mass,
    pos,
    quat,
    groundMaterial
  );
  tile.receiveShadow = true;
  tile.castShadow = mass > 0;
  return tile;
}

// Cambia las baldosas estáticas por otras iguales con masa, para que la
// explosión pueda lanzarlas. Devuelve las baldosas nuevas.
export function breakGround() {
  const debris = tiles.map((tile) => {
    const pos = tile.position.clone();
    const quat = tile.quaternion.clone();
    removeObject(tile);
    return createTile(pos, quat, TILE_MASS);
  });
  tiles = debris;
  return debris;
}

// Quita las baldosas (estén donde estén) y vuelve a poner el suelo con una
// animación: las baldosas suben desde abajo en una onda que sale del centro.
// Devuelve lo que tarda la animación en milisegundos.
export function resetGround() {
  for (const t of tileTweens) t.stop();
  tileTweens = [];
  for (const tile of tiles) removeObject(tile);
  tiles = [];
  createGround();

  // La física ya está en su sitio; solo se anima la malla (las baldosas
  // estáticas no se sincronizan con la física, así que se pueden mover)
  let duration = 0;
  for (const tile of tiles) {
    const finalY = tile.position.y;
    const delay = Math.hypot(tile.position.x, tile.position.z) * WAVE_DELAY;
    duration = Math.max(duration, delay + RISE_TIME);

    tile.position.y = RISE_FROM;
    const tween = createTween({ y: RISE_FROM })
      .to({ y: finalY }, RISE_TIME)
      .delay(delay)
      .easing(TWEEN.Easing.Back.Out) // se pasa un poco y vuelve a su sitio
      .onUpdate((v) => {
        tile.position.y = v.y;
      })
      .start();
    tileTweens.push(tween);
  }
  return duration;
}

// ---------------------------------------------------------------------------
// Pórtico de madera: dos postes y una viga (estático, la bomba no le afecta)
// ---------------------------------------------------------------------------
function createGallows() {
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion(0, 0, 0, 1);
  const wood = new THREE.MeshPhongMaterial({ color: 0x8b5a2b });
  for (const x of [-1.6, 1.6]) {
    pos.set(x, 2.2, 0);
    createBoxWithPhysics(0.25, 4.4, 0.25, 0, pos, quat, wood).castShadow = true;
  }
  pos.set(0, BEAM_Y, 0);
  const beam = createBoxWithPhysics(3.6, 0.25, 0.25, 0, pos, quat, wood);
  beam.castShadow = true;
  beamBody = beam.userData.physicsBody;
}

// Textura de cuadrícula generada en un canvas (sin depender de URLs externas).
// Se repite una vez por metro dentro de cada baldosa.
function createGridTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#e8e8e8";
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = "#9a9a9a";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(TILE_SIZE, TILE_SIZE);
  return texture;
}