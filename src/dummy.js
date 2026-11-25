import * as THREE from "three";
import Ammo from "ammojs-typed";
import { physicsWorld, margin, createRigidBody, removeObject } from "./physics.js";
import { scene } from "./scene.js";
import { beamBody, BEAM_Y } from "./environment.js";

// ------------------------------------------------------------
// Aspecto: muñeco de pruebas de choque (amarillo y gris oscuro)
// ------------------------------------------------------------
const YELLOW = 0xf2c200;
const DARK_GRAY = 0x2b2b2b;
const ROPE_COLOR = 0x8b6b3d;

const yellowMaterial = new THREE.MeshPhongMaterial({ color: YELLOW, shininess: 40 });
const grayMaterial = new THREE.MeshPhongMaterial({ color: DARK_GRAY, shininess: 20 });

// ------------------------------------------------------------
// Medidas (en metros). Las cápsulas: r = radio, h = altura del cilindro
// (sin contar las semiesferas), igual que btCapsuleShape(radius, height)
// ------------------------------------------------------------
const ROPE_LENGTH = 1.08;
const HEAD_RADIUS = 0.22;
const TORSO = { w: 0.6, h: 0.7, d: 0.35 };
const PELVIS = { w: 0.5, h: 0.3, d: 0.3 };
const UPPER_ARM = { r: 0.1, h: 0.45 };
const FOREARM = { r: 0.09, h: 0.4 };
const THIGH = { r: 0.13, h: 0.75 };
const SHIN = { r: 0.12, h: 0.65 };
const GAP = 0.05; // pequeña separación entre piezas
const HIP_X = 0.15; // separación lateral de las caderas

// Masas (kg)
const MASS = {
  head: 1.5,
  torso: 5,
  pelvis: 3,
  upperArm: 1,
  forearm: 0.8,
  thigh: 2.5,
  shin: 2,
};

// Amortiguación para que el muñeco no tiemble
const LINEAR_DAMPING = 0.05;
const ANGULAR_DAMPING = 0.6;

// Límites de las bisagras (radianes)
const ELBOW_LIMITS = [0, 2.4]; // los codos doblan hacia delante
const KNEE_LIMITS = [-2.4, 0]; // las rodillas doblan hacia atrás

// ------------------------------------------------------------
// Estado del muñeco
// ------------------------------------------------------------
let parts = {}; // nombre -> objeto 3D (con userData.physicsBody)
let constraints = []; // uniones entre piezas
let ropeConstraint = null; // unión cabeza-viga
let ropeLine = null; // línea que dibuja la cuerda

// Punto de la viga del que cuelga la cuerda (mundo)
const hangPoint = new THREE.Vector3(0, BEAM_Y, 0);
const tmpVec = new THREE.Vector3();

// ------------------------------------------------------------
// Utilidades gráficas
// ------------------------------------------------------------

// Cápsula gráfica: cilindro + dos esferas (no hay CapsuleGeometry en esta versión)
function createCapsuleMesh(radius, height) {
  const group = new THREE.Group();

  const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 16),
    yellowMaterial
  );
  const sphereGeometry = new THREE.SphereGeometry(radius, 16, 12);
  const top = new THREE.Mesh(sphereGeometry, grayMaterial);
  const bottom = new THREE.Mesh(sphereGeometry, grayMaterial);
  top.position.y = height / 2;
  bottom.position.y = -height / 2;

  group.add(cylinder, top, bottom);
  enableShadows(group);
  return group;
}

function createHeadMesh() {
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(HEAD_RADIUS, 20, 16),
    yellowMaterial
  );
  // Visera oscura en la cara (el muñeco mira hacia +Z)
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(HEAD_RADIUS * 1.2, HEAD_RADIUS * 0.35, HEAD_RADIUS * 0.4),
    grayMaterial
  );
  visor.position.set(0, HEAD_RADIUS * 0.15, HEAD_RADIUS * 0.8);
  head.add(visor);
  enableShadows(head);
  return head;
}

function createTorsoMesh() {
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(TORSO.w, TORSO.h, TORSO.d),
    yellowMaterial
  );
  // Franja gris en el pecho
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(TORSO.w + 0.005, 0.06, TORSO.d + 0.005),
    grayMaterial
  );
  stripe.position.y = TORSO.h * 0.15;
  torso.add(stripe);
  enableShadows(torso);
  return torso;
}

function createPelvisMesh() {
  const pelvis = new THREE.Mesh(
    new THREE.BoxGeometry(PELVIS.w, PELVIS.h, PELVIS.d),
    grayMaterial
  );
  enableShadows(pelvis);
  return pelvis;
}

function enableShadows(object) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

// ------------------------------------------------------------
// Utilidades físicas
// ------------------------------------------------------------

// Crea el cuerpo rígido de una pieza y la guarda con su nombre
function addPart(name, object, shape, mass, position) {
  shape.setMargin(margin);
  object.position.copy(position);
  const quat = new THREE.Quaternion(); // todas las piezas empiezan sin girar

  const body =
    createRigidBody(object, shape, mass, position, quat) ||
    object.userData.physicsBody;

  body.setDamping(LINEAR_DAMPING, ANGULAR_DAMPING);
  body.setActivationState(4); // que no se duerma
  object.userData.physicsBody = body;

  object.userData.dummyPart = name; // marca las piezas del muñeco (la bomba no les afecta)
  parts[name] = object;
  return body;
}

function bodyOf(name) {
  return parts[name].userData.physicsBody;
}

// Pasa un punto del mundo al sistema local de una pieza
// (válido porque las piezas se crean sin rotación)
function toLocalPivot(name, worldPoint) {
  const p = worldPoint.clone().sub(parts[name].position);
  return new Ammo.btVector3(p.x, p.y, p.z);
}

// Rótula: btPoint2PointConstraint
function addBallJoint(nameA, nameB, worldPoint) {
  const pivotA = toLocalPivot(nameA, worldPoint);
  const pivotB = toLocalPivot(nameB, worldPoint);

  const constraint = new Ammo.btPoint2PointConstraint(
    bodyOf(nameA),
    bodyOf(nameB),
    pivotA,
    pivotB
  );
  // true = las piezas unidas no colisionan entre sí
  physicsWorld.addConstraint(constraint, true);
  constraints.push(constraint);

  Ammo.destroy(pivotA);
  Ammo.destroy(pivotB);
  return constraint;
}

// Bisagra en el eje X: btHingeConstraint con límites
function addHingeJoint(nameA, nameB, worldPoint, [low, high]) {
  const pivotA = toLocalPivot(nameA, worldPoint);
  const pivotB = toLocalPivot(nameB, worldPoint);
  const axis = new Ammo.btVector3(1, 0, 0);

  const constraint = new Ammo.btHingeConstraint(
    bodyOf(nameA),
    bodyOf(nameB),
    pivotA,
    pivotB,
    axis,
    axis,
    false
  );
  // Con el muñeco mirando a +Z, un ángulo positivo lleva la pieza B hacia delante
  constraint.setLimit(low, high, 0.9, 0.3, 1.0);

  physicsWorld.addConstraint(constraint, true);
  constraints.push(constraint);

  Ammo.destroy(pivotA);
  Ammo.destroy(pivotB);
  Ammo.destroy(axis);
  return constraint;
}

// ------------------------------------------------------------
// Creación del muñeco
// ------------------------------------------------------------
export function createDummy() {
  // Si ya había uno, se elimina antes
  removeDummy();

  // --- Posiciones verticales (de arriba abajo) ---
  const headY = BEAM_Y - ROPE_LENGTH - HEAD_RADIUS;
  const neckY = headY - HEAD_RADIUS - GAP / 2;
  const torsoY = headY - HEAD_RADIUS - GAP - TORSO.h / 2;
  const waistY = torsoY - TORSO.h / 2 - GAP / 2;
  const pelvisY = torsoY - TORSO.h / 2 - GAP - PELVIS.h / 2;

  // Hombros: centro de la esfera superior del brazo
  const shoulderY = torsoY + TORSO.h / 2 - UPPER_ARM.r;
  const shoulderX = TORSO.w / 2 + UPPER_ARM.r + GAP;
  const elbowY = shoulderY - UPPER_ARM.h;

  // Caderas: centro de la esfera superior del muslo
  const hipY = pelvisY - PELVIS.h / 2;
  const kneeY = hipY - THIGH.h;

  // --- Cuerpo central ---
  addPart(
    "head",
    createHeadMesh(),
    new Ammo.btSphereShape(HEAD_RADIUS),
    MASS.head,
    new THREE.Vector3(0, headY, 0)
  );
  addPart(
    "torso",
    createTorsoMesh(),
    new Ammo.btBoxShape(new Ammo.btVector3(TORSO.w / 2, TORSO.h / 2, TORSO.d / 2)),
    MASS.torso,
    new THREE.Vector3(0, torsoY, 0)
  );
  addPart(
    "pelvis",
    createPelvisMesh(),
    new Ammo.btBoxShape(new Ammo.btVector3(PELVIS.w / 2, PELVIS.h / 2, PELVIS.d / 2)),
    MASS.pelvis,
    new THREE.Vector3(0, pelvisY, 0)
  );

  // --- Brazos y piernas (izquierda = +X, derecha = -X) ---
  for (const side of [1, -1]) {
    const suffix = side > 0 ? "Left" : "Right";

    // Brazo y antebrazo
    addPart(
      "upperArm" + suffix,
      createCapsuleMesh(UPPER_ARM.r, UPPER_ARM.h),
      new Ammo.btCapsuleShape(UPPER_ARM.r, UPPER_ARM.h),
      MASS.upperArm,
      new THREE.Vector3(side * shoulderX, shoulderY - UPPER_ARM.h / 2, 0)
    );
    addPart(
      "forearm" + suffix,
      createCapsuleMesh(FOREARM.r, FOREARM.h),
      new Ammo.btCapsuleShape(FOREARM.r, FOREARM.h),
      MASS.forearm,
      new THREE.Vector3(side * shoulderX, elbowY - FOREARM.h / 2, 0)
    );

    // Muslo y pierna
    addPart(
      "thigh" + suffix,
      createCapsuleMesh(THIGH.r, THIGH.h),
      new Ammo.btCapsuleShape(THIGH.r, THIGH.h),
      MASS.thigh,
      new THREE.Vector3(side * HIP_X, hipY - THIGH.h / 2, 0)
    );
    addPart(
      "shin" + suffix,
      createCapsuleMesh(SHIN.r, SHIN.h),
      new Ammo.btCapsuleShape(SHIN.r, SHIN.h),
      MASS.shin,
      new THREE.Vector3(side * HIP_X, kneeY - SHIN.h / 2, 0)
    );
  }

  // --- Rótulas ---
  addBallJoint("head", "torso", new THREE.Vector3(0, neckY, 0)); // cuello
  addBallJoint("torso", "pelvis", new THREE.Vector3(0, waistY, 0)); // cintura

  for (const side of [1, -1]) {
    const suffix = side > 0 ? "Left" : "Right";
    // Hombro
    addBallJoint(
      "torso",
      "upperArm" + suffix,
      new THREE.Vector3(side * shoulderX, shoulderY, 0)
    );
    // Cadera
    addBallJoint(
      "pelvis",
      "thigh" + suffix,
      new THREE.Vector3(side * HIP_X, hipY, 0)
    );

    // --- Bisagras ---
    // Codo
    addHingeJoint(
      "upperArm" + suffix,
      "forearm" + suffix,
      new THREE.Vector3(side * shoulderX, elbowY, 0),
      ELBOW_LIMITS
    );
    // Rodilla
    addHingeJoint(
      "thigh" + suffix,
      "shin" + suffix,
      new THREE.Vector3(side * HIP_X, kneeY, 0),
      KNEE_LIMITS
    );
  }

  createRope();
  return parts;
}

// ------------------------------------------------------------
// Cuerda: unión cabeza-viga + línea visible
// ------------------------------------------------------------
function createRope() {
  // Punto de enganche expresado en el sistema local de la viga
  const beamOrigin = beamBody.getWorldTransform().getOrigin();
  const pivotInBeam = new Ammo.btVector3(
    hangPoint.x - beamOrigin.x(),
    hangPoint.y - beamOrigin.y(),
    hangPoint.z - beamOrigin.z()
  );
  // En la cabeza, el enganche está encima, a la distancia de la cuerda
  const pivotInHead = new Ammo.btVector3(0, HEAD_RADIUS + ROPE_LENGTH, 0);

  ropeConstraint = new Ammo.btPoint2PointConstraint(
    bodyOf("head"),
    beamBody,
    pivotInHead,
    pivotInBeam
  );
  // La cabeza tampoco colisiona con la viga
  physicsWorld.addConstraint(ropeConstraint, true);

  Ammo.destroy(pivotInBeam);
  Ammo.destroy(pivotInHead);

  // Línea de la viga a la cabeza
  const geometry = new THREE.BufferGeometry().setFromPoints([
    hangPoint.clone(),
    hangPoint.clone(),
  ]);
  ropeLine = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: ROPE_COLOR }));
  ropeLine.frustumCulled = false; // se mueve cada frame, que no la recorte la cámara
  scene.add(ropeLine);

  updateRope();
}

// Llamar en cada frame (después de actualizar la física)
export function updateRope() {
  if (!ropeLine || !parts.head) return;

  const head = parts.head;
  // Parte superior de la cabeza en coordenadas del mundo
  tmpVec
    .set(0, HEAD_RADIUS, 0)
    .applyQuaternion(head.quaternion)
    .add(head.position);

  const positions = ropeLine.geometry.attributes.position;
  positions.setXYZ(0, hangPoint.x, hangPoint.y, hangPoint.z);
  positions.setXYZ(1, tmpVec.x, tmpVec.y, tmpVec.z);
  positions.needsUpdate = true;
}

function removeRopeLine() {
  if (!ropeLine) return;
  scene.remove(ropeLine);
  ropeLine.geometry.dispose();
  ropeLine.material.dispose();
  ropeLine = null;
}

// Corta la cuerda: el muñeco cae
export function cutRope() {
  if (!ropeConstraint) return;

  physicsWorld.removeConstraint(ropeConstraint);
  Ammo.destroy(ropeConstraint);
  ropeConstraint = null;
  removeRopeLine();

  // Despertar todas las piezas por si alguna estaba en reposo
  Object.values(parts).forEach((part) => part.userData.physicsBody.activate());
}

// ------------------------------------------------------------
// Eliminar el muñeco completo
// ------------------------------------------------------------
export function removeDummy() {
  // Primero las uniones (antes de borrar los cuerpos)
  cutRope();
  constraints.forEach((constraint) => {
    physicsWorld.removeConstraint(constraint);
    Ammo.destroy(constraint);
  });
  constraints = [];

  // Después las piezas
  Object.values(parts).forEach((part) => removeObject(part));
  parts = {};
}
// ------------------------------------------------------------
// Punto al que apuntan las torretas (el centro del torso)
// ------------------------------------------------------------
export function getTargetPosition() {
  return parts.torso ? parts.torso.position : null;
}