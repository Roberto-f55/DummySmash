// Bola: esfera ligera lanzada desde la cámara
import * as THREE from "three";
import Ammo from "ammojs-typed";

const RADIUS = 0.3;

export const ball = {
  label: "Bola",
  key: "1",
  mass: 1,
  speed: 22,
  create(material) {
    return {
      mesh: new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 16, 12), material),
      shape: new Ammo.btSphereShape(RADIUS),
    };
  },
};