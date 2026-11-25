// Mundo físico con Ammo y utilidades para crear/eliminar cuerpos rígidos
// (basado en script_45_ammo.js)
import * as THREE from "three";
import Ammo from "ammojs-typed";
import { scene } from "./scene";

export let physicsWorld;
export const margin = 0.05; // margen de colisión
const gravityConstant = 9.8;

// Cuerpos con masa: se sincronizan con su malla en cada fotograma
const rigidBodies = [];
let transformAux;

export function initPhysics() {
  const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
  const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
  const broadphase = new Ammo.btDbvtBroadphase();
  const solver = new Ammo.btSequentialImpulseConstraintSolver();
  physicsWorld = new Ammo.btDiscreteDynamicsWorld(
    dispatcher,
    broadphase,
    solver,
    collisionConfiguration
  );
  physicsWorld.setGravity(new Ammo.btVector3(0, -gravityConstant, 0));

  transformAux = new Ammo.btTransform();
}

// Crea el cuerpo físico de una malla y lo añade a la escena y al mundo físico
export function createRigidBody(object, physicsShape, mass, pos, quat, vel, angVel) {
  if (pos) object.position.copy(pos);
  else pos = object.position;
  if (quat) object.quaternion.copy(quat);
  else quat = object.quaternion;

  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
  transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
  const motionState = new Ammo.btDefaultMotionState(transform);
  const localInertia = new Ammo.btVector3(0, 0, 0);
  physicsShape.calculateLocalInertia(mass, localInertia);
  const rbInfo = new Ammo.btRigidBodyConstructionInfo(
    mass,
    motionState,
    physicsShape,
    localInertia
  );
  const body = new Ammo.btRigidBody(rbInfo);
  body.setFriction(0.5);

  if (vel) body.setLinearVelocity(new Ammo.btVector3(vel.x, vel.y, vel.z));
  if (angVel)
    body.setAngularVelocity(new Ammo.btVector3(angVel.x, angVel.y, angVel.z));

  object.userData.physicsBody = body;
  scene.add(object);
  if (mass > 0) {
    rigidBodies.push(object);
    body.setActivationState(4); // nunca se "duerme"
  }
  physicsWorld.addRigidBody(body);
  return body;
}

export function createBoxWithPhysics(sx, sy, sz, mass, pos, quat, material) {
  const object = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  const shape = new Ammo.btBoxShape(
    new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5)
  );
  shape.setMargin(margin);
  createRigidBody(object, shape, mass, pos, quat);
  return object;
}

export function removeObject(mesh) {
  physicsWorld.removeRigidBody(mesh.userData.physicsBody);
  scene.remove(mesh);
  const i = rigidBodies.indexOf(mesh);
  if (i >= 0) rigidBodies.splice(i, 1);
}

export function updatePhysics(deltaTime) {
  physicsWorld.stepSimulation(deltaTime, 10);

  for (const objThree of rigidBodies) {
    const ms = objThree.userData.physicsBody.getMotionState();
    if (ms) {
      ms.getWorldTransform(transformAux);
      const p = transformAux.getOrigin();
      const q = transformAux.getRotation();
      objThree.position.set(p.x(), p.y(), p.z());
      objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
    }
  }
}

// Devuelve una copia de la lista de objetos con masa (los que se mueven)
export function getDynamicObjects() {
  return rigidBodies.slice();
}