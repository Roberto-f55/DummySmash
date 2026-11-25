// Cubo: caja lanzada desde la cámara
import * as THREE from "three";
import Ammo from "ammojs-typed";

const SIZE = 0.5;

export const cube = {
  label: "Cubo",
  key: "2",
  mass: 3,
  speed: 18,
  create(material) {
    const half = SIZE / 2;
    return {
      mesh: new THREE.Mesh(new THREE.BoxGeometry(SIZE, SIZE, SIZE), material),
      shape: new Ammo.btBoxShape(new Ammo.btVector3(half, half, half)),
    };
  },
};