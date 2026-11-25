// Coche: carrocería, cabina y cuatro ruedas. Sale desde el suelo y avanza
// en horizontal hacia donde se apunta
import * as THREE from "three";
import Ammo from "ammojs-typed";
import { margin } from "../physics";

const CAR = {
  width: 1.8,
  length: 3.6,
  bodyHeight: 0.6,
  cabin: { w: 1.6, h: 0.55, l: 1.8 },
  wheelRadius: 0.35,
  wheelWidth: 0.3,
};

export const car = {
  label: "Coche",
  key: "3",
  mass: 300,
  speed: 14,
  friction: 0.1, // bajo para que "ruede" en vez de frenar en seco
  create: createCar,
  spawn: spawnOnGround,
};

// Sale desde el suelo, bajo la cámara, mirando hacia donde se apunta
function spawnOnGround(origin, direction, speed) {
  const forward = new THREE.Vector3(direction.x, 0, direction.z).normalize();
  const pos = new THREE.Vector3(origin.x, CAR.wheelRadius + 0.3, origin.z);
  // La parte delantera del coche es su eje +Z local
  const quat = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    Math.atan2(forward.x, forward.z)
  );
  return { pos, quat, vel: forward.multiplyScalar(speed) };
}

function createCar(material) {
  const { width, length, bodyHeight, cabin, wheelRadius, wheelWidth } = CAR;

  // Gráficos: el origen del coche es el centro de la carrocería
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, bodyHeight, length),
    material
  );
  const cabinMesh = new THREE.Mesh(
    new THREE.BoxGeometry(cabin.w, cabin.h, cabin.l),
    new THREE.MeshPhongMaterial({ color: 0x223344 })
  );
  cabinMesh.position.set(0, bodyHeight / 2 + cabin.h / 2, -0.2);
  mesh.add(cabinMesh);

  const wheelGeometry = new THREE.CylinderGeometry(
    wheelRadius,
    wheelRadius,
    wheelWidth,
    16
  );
  wheelGeometry.rotateZ(Math.PI / 2); // eje de la rueda en X
  const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x111111 });
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(
        x * (width / 2 - wheelWidth / 2),
        -bodyHeight / 2,
        z * (length / 2 - wheelRadius - 0.1)
      );
      mesh.add(wheel);
    }
  }
  mesh.traverse((child) => {
    child.castShadow = true;
    child.receiveShadow = true;
  });

  // Física: forma compuesta con la carrocería (incluyendo las ruedas) y la cabina
  const shape = new Ammo.btCompoundShape();
  const bottom = -bodyHeight / 2 - wheelRadius; // parte baja de las ruedas
  const top = bodyHeight / 2;
  addChildBox(shape, [width / 2, (top - bottom) / 2, length / 2], [0, (top + bottom) / 2, 0]);
  addChildBox(shape, [cabin.w / 2, cabin.h / 2, cabin.l / 2], [0, top + cabin.h / 2, -0.2]);

  return { mesh, shape };
}

function addChildBox(compound, halfExtents, position) {
  const box = new Ammo.btBoxShape(new Ammo.btVector3(...halfExtents));
  box.setMargin(margin);
  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(...position));
  compound.addChildShape(transform, box);
}