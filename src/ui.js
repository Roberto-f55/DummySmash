// Interfaz: panel HTML con el selector de arma, ratón y teclado
import * as THREE from "three";
import { camera, renderer } from "./scene";
import { weapons, currentWeapon, selectWeapon, shoot } from "./weapons";

const weaponButtons = {};

// actions: { cutRope, reset } -> funciones que se ejecutan con botones/teclas
export function initUI(actions) {
  createPanel(actions);
  initMouse();
  initKeyboard(actions);
  chooseWeapon(currentWeapon);
}

function chooseWeapon(id) {
  selectWeapon(id);
  for (const [key, button] of Object.entries(weaponButtons)) {
    button.classList.toggle("active", key === id);
  }
}

function createPanel(actions) {
  const css = document.createElement("style");
  css.textContent = `
    #panel { position: fixed; top: 12px; left: 12px; display: flex; gap: 6px;
      flex-wrap: wrap; font-family: sans-serif; user-select: none; }
    #panel button { padding: 8px 14px; border: none; border-radius: 6px;
      background: #ffffffcc; cursor: pointer; font-size: 14px; }
    #panel button.active { background: #f2c94c; font-weight: bold; }
    #help { position: fixed; bottom: 12px; left: 12px; font: 13px sans-serif;
      color: #333; background: #ffffffaa; padding: 6px 10px; border-radius: 6px; }
  `;
  document.head.appendChild(css);

  const panel = document.createElement("div");
  panel.id = "panel";

  const addButton = (text, onClick) => {
    const button = document.createElement("button");
    button.textContent = text;
    button.onclick = onClick;
    panel.appendChild(button);
    return button;
  };

  for (const [id, weapon] of Object.entries(weapons)) {
    weaponButtons[id] = addButton(`${weapon.key} · ${weapon.label}`, () =>
      chooseWeapon(id)
    );
  }
  addButton("C · Cortar cuerda", actions.cutRope);
  addButton("R · Reiniciar", actions.reset);
  document.body.appendChild(panel);

  const help = document.createElement("div");
  help.id = "help";
  help.textContent = "Clic: lanzar · Arrastrar: girar cámara · Rueda: zoom";
  document.body.appendChild(help);
}

// Clic para lanzar; si se arrastra (para girar la cámara) no se lanza nada
function initMouse() {
  const mouseCoords = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  let start = null;

  renderer.domElement.addEventListener("pointerdown", (e) => {
    start = { x: e.clientX, y: e.clientY };
  });

  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!start || e.button !== 0) return;
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    start = null;
    if (moved > 5) return;

    mouseCoords.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouseCoords, camera);
    shoot(raycaster.ray.origin, raycaster.ray.direction);
  });
}

function initKeyboard(actions) {
  window.addEventListener("keydown", (e) => {
    for (const [id, weapon] of Object.entries(weapons)) {
      if (e.key === weapon.key) chooseWeapon(id);
    }
    const key = e.key.toLowerCase();
    if (key === "c") actions.cutRope();
    if (key === "r") actions.reset();
  });
}