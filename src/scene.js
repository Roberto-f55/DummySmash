// Escena gráfica: cámara, renderer, luces y controles de cámara
import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { createTween } from "./animation";

export let scene, camera, renderer, controls;

// Posición inicial de la cámara y del punto al que mira
const CAMERA_START = new THREE.Vector3(4, 3.5, 9);
const TARGET_START = new THREE.Vector3(0, 2, 0);

export function initGraphics() {
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.2,
    2000
  );
  camera.position.copy(CAMERA_START);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd1e5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.style.margin = "0";
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(TARGET_START);
  controls.update();

  createLights();

  window.addEventListener("resize", onWindowResize);
}

// Devuelve la cámara a su posición inicial con una animación
export function resetCamera(duration) {
  const from = {
    px: camera.position.x, py: camera.position.y, pz: camera.position.z,
    tx: controls.target.x, ty: controls.target.y, tz: controls.target.z,
  };
  const to = {
    px: CAMERA_START.x, py: CAMERA_START.y, pz: CAMERA_START.z,
    tx: TARGET_START.x, ty: TARGET_START.y, tz: TARGET_START.z,
  };
  createTween(from)
    .to(to, duration)
    .easing(TWEEN.Easing.Cubic.InOut)
    .onUpdate((v) => {
      camera.position.set(v.px, v.py, v.pz);
      controls.target.set(v.tx, v.ty, v.tz);
      controls.update();
    })
    .start();
}

function createLights() {
  scene.add(new THREE.AmbientLight(0x707070));

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(-6, 14, 8);
  light.castShadow = true;
  const d = 10;
  light.shadow.camera.left = -d;
  light.shadow.camera.right = d;
  light.shadow.camera.top = d;
  light.shadow.camera.bottom = -d;
  light.shadow.camera.near = 2;
  light.shadow.camera.far = 50;
  light.shadow.mapSize.set(2048, 2048);
  scene.add(light);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}