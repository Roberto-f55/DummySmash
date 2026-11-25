// Torreta: se coloca en el suelo con un clic y dispara sola hacia el muñeco.
// Tiene masa, así que el coche o los proyectiles pueden tumbarla; si está
// tumbada deja de apuntar y sigue disparando hacia donde mire el cañón.
import * as THREE from "three";
import Ammo from "ammojs-typed";
import { margin, createRigidBody, removeObject } from "../physics";
import { getTargetPosition } from "../dummy";
import { playSound } from "../sounds";

const MAX_TURRETS = 5;
const BASE = { w: 0.6, h: 0.5, d: 0.6 };
const BASE_MASS = 15;
const HEAD_RADIUS = 0.2;
const BARREL = { r: 0.05, length: 0.55 };

const FIRE_INTERVAL = 0.6; // segundos entre disparos
const BULLET = { r: 0.06, mass: 0.3, speed: 35, life: 3 }; // vida en segundos
const UPRIGHT_LIMIT = 0.8; // por debajo, la torreta se considera tumbada

const turrets = [];
const bullets = [];
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// Entrada para el selector de armas: en vez de lanzar algo, coloca una torreta
export const turret = {
  label: "Torreta",
  key: "4",
  use(origin, direction) {
    const ray = new THREE.Ray(origin, direction);
    const point = ray.intersectPlane(groundPlane, new THREE.Vector3());
    if (point) placeTurret(point);
  },
};

// ---------------------------------------------------------------------------
// Creación
// ---------------------------------------------------------------------------
function placeTurret(point) {
  const metal = new THREE.MeshPhongMaterial({ color: 0x556b2f });
  const dark = new THREE.MeshPhongMaterial({ color: 0x222222 });

  // Base (es la que tiene el cuerpo físico)
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(BASE.w, BASE.h, BASE.d),
    metal
  );

  // Cabeza giratoria (solo gráfica) con el cañón apuntando a su +Z
  const head = new THREE.Object3D();
  head.position.y = BASE.h / 2 + HEAD_RADIUS * 0.6;
  base.add(head);

  const dome = new THREE.Mesh(new THREE.SphereGeometry(HEAD_RADIUS, 16, 12), metal);
  head.add(dome);

  const barrelGeometry = new THREE.CylinderGeometry(
    BARREL.r,
    BARREL.r,
    BARREL.length,
    12
  );
  barrelGeometry.rotateX(Math.PI / 2); // cilindro a lo largo de Z
  barrelGeometry.translate(0, 0, BARREL.length / 2);
  head.add(new THREE.Mesh(barrelGeometry, dark));

  // Punto de salida de las balas, un poco más allá de la boca del cañón
  const muzzle = new THREE.Object3D();
  muzzle.position.z = BARREL.length + BULLET.r * 2;
  head.add(muzzle);

  base.traverse((child) => {
    child.castShadow = true;
    child.receiveShadow = true;
  });

  // Física: una caja que cubre la base y la cabeza
  const totalHeight = BASE.h + HEAD_RADIUS * 1.6;
  const shape = new Ammo.btBoxShape(
    new Ammo.btVector3(BASE.w / 2, totalHeight / 2, BASE.d / 2)
  );
  shape.setMargin(margin);
  // La caja física está centrada más arriba que la malla de la base
  const compound = new Ammo.btCompoundShape();
  const offset = new Ammo.btTransform();
  offset.setIdentity();
  offset.setOrigin(new Ammo.btVector3(0, (totalHeight - BASE.h) / 2, 0));
  compound.addChildShape(offset, shape);

  const pos = new THREE.Vector3(point.x, BASE.h / 2 + 0.02, point.z);
  const body = createRigidBody(base, compound, BASE_MASS, pos, new THREE.Quaternion());
  body.setFriction(0.9);

  turrets.push({ base, head, muzzle, cooldown: Math.random() * FIRE_INTERVAL });
  if (turrets.length > MAX_TURRETS) removeObject(turrets.shift().base);
}

// ---------------------------------------------------------------------------
// Actualización (llamar en cada fotograma)
// ---------------------------------------------------------------------------
const _up = new THREE.Vector3();
const _target = new THREE.Vector3();
const _muzzlePos = new THREE.Vector3();
const _direction = new THREE.Vector3();

export function updateTurrets(deltaTime) {
  const target = getTargetPosition();

  for (const t of turrets) {
    t.base.updateMatrixWorld(true);

    // ¿Sigue de pie? (su eje Y local apunta hacia arriba)
    _up.set(0, 1, 0).applyQuaternion(t.base.quaternion);
    const upright = _up.y > UPRIGHT_LIMIT;

    if (upright && target) {
      // Gira la cabeza hacia el muñeco
      t.head.lookAt(_target.copy(target));
      t.head.updateMatrixWorld(true);
    }

    t.cooldown -= deltaTime;
    if (t.cooldown <= 0) {
      t.cooldown = FIRE_INTERVAL;
      fire(t);
    }
  }

  updateBullets(deltaTime);
}

function fire(t) {
  t.muzzle.getWorldPosition(_muzzlePos);
  t.head.getWorldDirection(_direction); // dirección del eje +Z de la cabeza

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(BULLET.r, 8, 6),
    new THREE.MeshPhongMaterial({ color: 0xffaa00, emissive: 0x663300 })
  );
  mesh.castShadow = true;
  const shape = new Ammo.btSphereShape(BULLET.r);
  shape.setMargin(margin);

  const vel = _direction.clone().multiplyScalar(BULLET.speed);
  const body = createRigidBody(mesh, shape, BULLET.mass, _muzzlePos, new THREE.Quaternion(), vel);
  // Detección continua de colisiones: evita que la bala atraviese al muñeco
  body.setCcdMotionThreshold(BULLET.r);
  body.setCcdSweptSphereRadius(BULLET.r * 0.8);

  bullets.push({ mesh, age: 0 });
  playSound("shot", _muzzlePos);
}

function updateBullets(deltaTime) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].age += deltaTime;
    if (bullets[i].age > BULLET.life) {
      removeObject(bullets[i].mesh);
      bullets.splice(i, 1);
    }
  }
}

export function removeTurrets() {
  while (turrets.length) removeObject(turrets.pop().base);
  while (bullets.length) removeObject(bullets.pop().mesh);
}