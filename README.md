# Ragdoll Lab: muñeco de pruebas con físicas en Three.js

Prototipo interactivo hecho con **Three.js**, **ammo.js** (motor de física) y **tween.js** (animaciones por interpolación). Un muñeco de pruebas de choque, articulado como un *ragdoll*, cuelga de un pórtico de madera, y el usuario lo pone a prueba con distintas "armas": bolas, cubos, coches, torretas que disparan solas y una bomba que arrasa el escenario.

- **Autor:** Roberto Rodríguez Guillén
- **Demo (CodeSandbox):** https://codesandbox.io/p/sandbox/48jdx5
- **Vídeo de captura:** https://youtu.be/LoPOzYytFTc 

---

## 1. Descripción del trabajo realizado

### Idea

Realizar un muñeco como los de algunas sátiras, películas o incluso anuncios, tirando hacia lo absurdo pero mostrando situaciones a las que realmente se podría haber sometido a un maniquí de pruebas.

El proyecto combina dos bibliotecas con papeles distintos:

- **ammo.js** para todo lo que se mueve: el muñeco, los proyectiles, los coches, las torretas y los escombros de la explosión.
- **tween.js** para las animaciones que no dependen de la física: la explosión de la bomba y el reinicio animado de la escena.

En lugar de que el usuario dispare directamente, algunas armas actúan por su cuenta: las torretas se colocan en el suelo y disparan solas hacia el muñeco, y la bomba destruye todo salvo el pórtico y el muñeco.

### Contenido de la escena

| Elemento | Detalle |
|---|---|
| **Suelo** | 40 × 40 m formado por 100 baldosas de 4 × 4 m con una textura de cuadrícula generada en un `canvas`. Las baldosas son estáticas, pero la bomba las convierte en cuerpos con masa y salen volando. |
| **Pórtico** | Dos postes y una viga de madera, estáticos. Es lo único que nunca se mueve. |
| **Muñeco** | *Ragdoll* de 11 piezas (cabeza, torso, pelvis, brazos, antebrazos, muslos y piernas), amarillo y gris como un muñeco de pruebas de choque, con visera en la cara y franja en el pecho. Cuelga de la viga por una cuerda. |
| **Cuerda** | Una línea que va de la viga a la cabeza y sigue al muñeco en cada fotograma. Se puede cortar con el botón **Cortar cuerda**. |

### El muñeco articulado

Cada pieza del muñeco es un cuerpo rígido con su propia forma de colisión: cajas (`btBoxShape`) para el torso y la pelvis, una esfera (`btSphereShape`) para la cabeza y cápsulas (`btCapsuleShape`) para las extremidades. Las piezas se unen con restricciones de Ammo:

| Articulación | Tipo | Comportamiento |
|---|---|---|
| Cuello, cintura, hombros y caderas | Rótula (`btPoint2PointConstraint`) | Giran en cualquier dirección |
| Codos | Bisagra (`btHingeConstraint`) con límite de 0 a 2,4 rad | Solo se doblan hacia delante |
| Rodillas | Bisagra (`btHingeConstraint`) con límite de −2,4 a 0 rad | Solo se doblan hacia atrás |
| Cuerda | Rótula entre la cabeza y la viga | El muñeco se balancea como un péndulo |

- Las piezas unidas no colisionan entre sí (`addConstraint(constraint, true)`), para que no se empujen en las articulaciones.
- Todas las piezas tienen amortiguación (`setDamping`) para que el muñeco no tiemble ni gire sin fin.
- Las medidas y masas están definidas como constantes al principio de `dummy.js`, y las posiciones de cada pieza y articulación se calculan a partir de ellas. En total, el muñeco pesa unos 22 kg.
- La versión de three.js de CodeSandbox no incluye `CapsuleGeometry`, así que las cápsulas se dibujan como un cilindro con una esfera en cada extremo. La física sí usa una cápsula real de Ammo.

### Armas

| Arma | Tecla | Qué hace |
|---|---|---|
| **Bola** | 1 | Esfera de 1 kg lanzada desde la cámara hacia donde se hace clic, a 22 m/s. |
| **Cubo** | 2 | Caja de 3 kg lanzada desde la cámara, a 18 m/s. |
| **Coche** | 3 | Coche de 300 kg (carrocería, cabina y cuatro ruedas) que sale del suelo bajo la cámara y avanza en horizontal hacia donde se apunta, a 14 m/s. |
| **Torreta** | 4 | Se coloca en el punto del suelo donde se hace clic y dispara sola al muñeco. |
| **Bomba** | 5 | Explota en el punto del suelo donde se hace clic y lo destruye todo menos el pórtico y el muñeco. |

Los proyectiles salen con un pequeño giro aleatorio. Como mucho hay 30 a la vez: al lanzar uno más, desaparece el más antiguo.

#### Coche

- Su forma de colisión es compuesta (`btCompoundShape`): una caja para la carrocería, que incluye las ruedas, y otra para la cabina.
- Tiene una fricción baja para que se deslice como si rodara en vez de frenar en seco.
- Por su altura, el coche golpea las piernas del muñeco, que sale volando y da vueltas colgado de la viga.

#### Torretas

- Cada torreta tiene una base con masa (15 kg) y una cabeza giratoria con un cañón.
- En cada fotograma, la cabeza gira hacia el torso del muñeco con `lookAt`, y cada 0,6 s dispara una bala desde la boca del cañón.
- Las balas son pequeñas y rápidas (35 m/s), y usan **detección continua de colisiones** (`setCcdMotionThreshold` y `setCcdSweptSphereRadius`) para no atravesar al muñeco entre un fotograma y el siguiente. Cada bala desaparece a los 3 segundos.
- Las torretas se pueden **derribar**: si el coche o un cubo las tumba, dejan de apuntar y siguen disparando hacia donde haya quedado el cañón. Para saber si están tumbadas se comprueba hacia dónde apunta su eje vertical.
- Como mucho hay 5 torretas a la vez.

#### Bomba

- **Física:** las baldosas estáticas del suelo se sustituyen por baldosas iguales con masa. Después, cada objeto con masa (salvo las piezas del muñeco) recibe una velocidad hacia fuera desde el punto de la explosión, con un empuje extra hacia arriba y un giro aleatorio. Cuanto más cerca está el objeto, más rápido sale. Todo acaba cayendo al vacío y solo queda el pórtico flotando con el muñeco colgado.
- **Animación con tween.js:**
  - una bola de fuego que crece (`Easing.Exponential.Out`) y pasa de amarillo a rojo mientras se desvanece;
  - una onda expansiva, un anillo (`RingGeometry`) que se abre por el suelo;
  - un destello de luz (`PointLight`) que se apaga en menos de un segundo.

### Reinicio animado

El botón **Reiniciar** monta de nuevo la escena con tween.js:

1. Se borran los proyectiles, las torretas, los escombros y el muñeco.
2. El suelo vuelve a aparecer: las baldosas suben desde abajo en una onda que sale del centro. Cada baldosa empieza más tarde cuanto más lejos está y usa `Easing.Back.Out`, que se pasa un poco y vuelve a su sitio, como si encajara.
3. A la vez, la cámara vuelve suavemente a su posición inicial (`Easing.Cubic.InOut`).
4. Al terminar la onda, unos 2 segundos después, aparece de nuevo el muñeco colgado.

La física de las baldosas se coloca en su sitio desde el principio y solo se anima la malla visible. Como las baldosas son estáticas, el bucle de física no las actualiza y la animación puede moverlas libremente. Si se pulsa **Reiniciar** varias veces seguidas, cada reinicio cancela la animación anterior.

### Sonido

Los sonidos se **generan por código**: no se usa ningún archivo de audio. Cada uno se calcula muestra a muestra al arrancar (ruido filtrado, ondas senoidales y en diente de sierra con envolventes de volumen) y se reproduce con las utilidades de audio de three.js: un `AudioListener` unido a la cámara y objetos `Audio` y `PositionalAudio`.

| Sonido | Cuándo suena | Cómo se genera |
|---|---|---|
| Lanzamiento | Al lanzar una bola o un cubo | Ruido filtrado que sube y baja ("fiuu") |
| Motor | Al lanzar un coche | Onda en diente de sierra que sube de tono |
| Disparo | Cada bala de una torreta | Chasquido corto de ruido con un golpe grave |
| Explosión | Al explotar la bomba | Ruido grave que se apaga poco a poco, más un retumbe de 45 Hz |
| Reconstrucción | Al reiniciar | Barrido de tono ascendente que acompaña a la onda del suelo |

Cada sonido está en su propio archivo dentro de `sounds/`, con su volumen y la función que lo genera. Todos menos el de reconstrucción usan `PositionalAudio`: suenan desde el punto donde ocurren, más fuerte cuanto más cerca está la cámara y por el lado correspondiente. Como los navegadores no permiten reproducir audio hasta que el usuario interactúa con la página, el audio se activa con el primer clic o la primera tecla.

### Animaciones con tween.js

Todas las animaciones pertenecen a un mismo grupo (`TWEEN.Group`, en `animation.js`) que se actualiza una vez por fotograma desde el bucle principal. En las versiones recientes de tween.js los tweens ya no se añaden solos al grupo global que actualiza `TWEEN.update()`, así que un grupo propio hace que el código funcione igual en versiones nuevas y antiguas.

### Controles

| Acción | Cómo |
|---|---|
| Usar el arma seleccionada | Clic con el botón izquierdo (sin arrastrar) |
| Rotar la vista | Arrastrar con el botón izquierdo |
| Desplazar la vista | Arrastrar con el botón derecho |
| Zoom | Rueda del ratón |
| Elegir arma | Botones del panel o teclas **1** a **5** |
| Cortar la cuerda | Botón **Cortar cuerda** o tecla **C** |
| Reiniciar la escena | Botón **Reiniciar** o tecla **R** |

Para distinguir un clic de un arrastre, el arma solo se usa si el ratón se ha movido menos de 5 píxeles entre que se pulsa y se suelta. Así se puede girar la cámara sin lanzar nada.

### Estructura del proyecto

El código (carpetas, archivos, variables y funciones) está en inglés; los comentarios, este README y los textos de la interfaz, en español.

```
src/
├── main.js             # Punto de entrada: inicialización, reinicio animado y bucle
├── scene.js            # Escena, cámara, renderer, luces, OrbitControls y vuelta de la cámara
├── physics.js          # Mundo físico de Ammo y creación/eliminación de cuerpos rígidos
├── environment.js      # Suelo en baldosas (rotura y reconstrucción) y pórtico
├── dummy.js            # Muñeco articulado, cuerda y punto al que apuntan las torretas
├── animation.js        # Grupo de animaciones de tween.js
├── sounds/
│   ├── index.js        # Lista de sonidos, inicio del audio y reproducción (3D)
│   ├── helpers.js      # Utilidades para generar sonidos (buffer, ruido, filtro)
│   ├── explosion.js    # Explosión
│   ├── shot.js         # Disparo
│   ├── throw.js        # Lanzamiento
│   ├── car.js          # Motor del coche
│   └── rebuild.js      # Reconstrucción
├── ui.js               # Panel de botones, ratón y teclado
└── weapons/
    ├── index.js        # Lista de armas, lanzamiento y límite de proyectiles
    ├── ball.js         # Bola
    ├── cube.js         # Cubo
    ├── car.js          # Coche
    ├── turret.js       # Torretas y sus balas
    └── bomb.js         # Bomba: rotura del suelo, empuje y animación
index.html              # Página; carga src/main.js
package.json            # Dependencias: three, ammojs-typed y @tweenjs/tween.js
sandbox.config.json     # Configuración para CodeSandbox
```

### Arquitectura

- **`physics.js`** solo gestiona el mundo físico: crear cuerpos, eliminarlos y sincronizar en cada fotograma la posición y la rotación de cada malla con su cuerpo.
- **`environment.js`**, **`dummy.js`** y los archivos de **`weapons/`** crean cada uno sus objetos usando `physics.js`.
- **Cada arma está en su propio archivo** y es un objeto con su texto, su tecla, su masa, su velocidad y una función que crea su malla y su forma de colisión. Las armas que no se lanzan (torreta y bomba) definen en su lugar una función `use()`. El panel de botones y las teclas se generan a partir de la lista de armas, así que para añadir una nueva basta con crear su archivo e incluirla en `weapons/index.js`.
- **`main.js`** conecta todo y ejecuta el bucle de animación: avanza la física, actualiza las torretas y la cuerda, actualiza los tweens y dibuja.

---

## 2. Fuentes utilizadas

### Librerías
- **Three.js** — https://threejs.org/ (incluido `OrbitControls` de `examples/jsm`)
- **ammo.js**, versión de Bullet compilada a JavaScript, mediante el paquete `ammojs-typed` — https://github.com/kripken/ammo.js/
- **tween.js** — https://github.com/tweenjs/tween.js

### Material de la ULPGC
- Ejemplos de animación y física de la asignatura de Informática Gráfica (ULPGC): https://codesandbox.io/p/sandbox/ig-s11-55vw2v
- El ejemplo **`script_45_ammo.js`** (muro de ladrillos con física) es la base del proyecto. De él vienen la inicialización del mundo físico, las funciones `createRigidBody()`, `createBoxWithPhysics()` y `updatePhysics()`, la escena con sombras y el lanzamiento de proyectiles con un `Raycaster`.
- El uso de tween.js (tweens con *easing*, retrasos y `onUpdate`) sigue los ejemplos `script_41` a `script_44` del mismo repositorio.
- Repositorio de GitHub: https://github.com/otsedom/otsedom.github.io/blob/main/IG/S11/README.md

### Documentación consultada
- Documentación de Three.js: https://threejs.org/docs/ (incluidas las clases de audio `AudioListener`, `Audio` y `PositionalAudio`)
- Definición de la API de ammo.js (`ammo.idl`, incluido en `ammojs-typed`), para comprobar qué funciones de Bullet están disponibles: restricciones con límites, formas compuestas, detección continua de colisiones e impulsos.
- Guía de usuario de tween.js: https://github.com/tweenjs/tween.js/blob/main/docs/user_guide.md


### Uso de IA
La IA se utilizó como apoyo durante el desarrollo, especialmente para resolver dudas sobre las restricciones físicas del muñeco y la generación de sonidos mediante código. Las propuestas obtenidas se fueron probando e integrando en el proyecto, realizando los ajustes necesarios para adaptarlas al funcionamiento del resto de la aplicación:


- **Conversación del muñeco:** creación del *ragdoll* con las restricciones de Ammo, que es la parte que no procede de los ejemplos del repositorio   https://claude.ai/share/b5cc0f68-43a1-46fc-b423-fecce6541370

---

## 3. Vídeo de ejecución

https://youtu.be/LoPOzYytFTc — captura del proyecto en funcionamiento: golpes al muñeco con bolas, cubos y coches, torretas disparando, la explosión de la bomba y el reinicio animado.

---

## 4. Cómo ejecutarlo

Abrir el enlace de CodeSandbox. Se elige un arma en el panel superior y se hace clic en la escena para usarla.

El archivo `sandbox.config.json` desactiva la protección contra bucles infinitos de CodeSandbox. Es necesario porque los sonidos se generan muestra a muestra al arrancar (la explosión son 3 segundos entre 44.000 y 48.000 muestras por segundo) y CodeSandbox interrumpe los bucles de más de 100.000 iteraciones, lo que deja la escena en negro.

---

## 5. Posibles mejoras

- Que tras la explosión solo quede colgando la cabeza del muñeco, rompiendo las demás articulaciones.
- Una cuerda flexible de verdad con los *soft bodies* de Ammo (como en el ejemplo `physics_ammo_rope` de three.js), en lugar de una unión rígida.
- Un pórtico que se pueda romper con uniones `btFixedConstraint` y `setBreakingImpulseThreshold`.

