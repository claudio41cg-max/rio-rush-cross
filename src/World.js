import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export const DEFAULT_ENVIRONMENT_PARAMS = {
  offsetY: 0,
}

const GROUND_SIZE = 300
const GROUND_THICKNESS = 0.5

// Scenario-only stunt loop. Vehicle.js, controls, camera and driving physics
// remain untouched.
const LOOP_RADIUS = 11
const LOOP_WIDTH = 7
const LOOP_THICKNESS = 0.55
const LOOP_SEGMENTS = 64
const LOOP_CENTER_Z = -38
const LOOP_BASE_Y = 0.34
const ENTRY_LENGTH = 22
const EXIT_LENGTH = 22
const TRANSITION_SEGMENTS = 18

export class World {
  constructor(scene, physicsWorld, reflectionMap = null) {
    this.scene = scene
    this.physicsWorld = physicsWorld
    this.reflectionMap = reflectionMap
    this.dynamicPairs = []
    this.environmentParams = { ...DEFAULT_ENVIRONMENT_PARAMS }

    this._createLights()
    this.ready = this._createAsphaltEnvironmentWithLoop()
  }

  _createLights() {
    const hemi = new THREE.HemisphereLight(0xcfe5ff, 0x3d4148, 2)
    this.scene.add(hemi)
    this.hemi = hemi

    const sun = new THREE.DirectionalLight(0xfff1cf, 2.55)
    sun.position.set(45, 75, 25)
    sun.castShadow = true

    const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false
    const shadowMapSize = isCoarsePointer ? 2048 : 4096
    sun.shadow.mapSize.set(shadowMapSize, shadowMapSize)
    sun.shadow.camera.left = -130
    sun.shadow.camera.right = 130
    sun.shadow.camera.top = 130
    sun.shadow.camera.bottom = -130
    sun.shadow.camera.far = 260
    sun.shadow.bias = -0.0001
    sun.shadow.normalBias = 0.025
    sun.shadow.radius = 3

    this.scene.add(sun)
    this.sun = sun
  }

  async _createAsphaltEnvironmentWithLoop() {
    const group = new THREE.Group()
    group.name = 'RioRushAsphaltLoopEnvironment'

    // Flat asphalt floor only. No other obstacles or scenery.
    const asphaltMaterial = new THREE.MeshStandardMaterial({
      color: 0x303236,
      roughness: 0.98,
      metalness: 0,
    })

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
      asphaltMaterial
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0
    ground.receiveShadow = true
    group.add(ground)

    const loopMaterial = new THREE.MeshStandardMaterial({
      color: 0x1557dc,
      roughness: 0.38,
      metalness: 0.08,
    })

    const loopBody = new CANNON.Body({
      mass: 0,
      material: this.physicsWorld.defaultMaterial,
    })

    const addTrackBox = (x, y, z, width, height, length, rotationX = 0) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, length),
        loopMaterial
      )
      mesh.position.set(x, y, z)
      mesh.rotation.x = rotationX
      mesh.castShadow = true
      mesh.receiveShadow = true
      group.add(mesh)

      const shape = new CANNON.Box(
        new CANNON.Vec3(width * 0.5, height * 0.5, length * 0.5)
      )
      const offset = new CANNON.Vec3(x, y, z)
      const rotation = new CANNON.Quaternion()
      rotation.setFromEuler(rotationX, 0, 0)
      loopBody.addShape(shape, offset, rotation)
    }

    // Long Hot-Wheels-style entry: starts almost flush with the asphalt and
    // rises very gently to the loop's bottom so the car can drive into it.
    const entryStartZ = LOOP_CENTER_Z + ENTRY_LENGTH
    for (let i = 0; i < TRANSITION_SEGMENTS; i++) {
      const a = i / TRANSITION_SEGMENTS
      const b = (i + 1) / TRANSITION_SEGMENTS
      const zA = THREE.MathUtils.lerp(entryStartZ, LOOP_CENTER_Z, a)
      const zB = THREE.MathUtils.lerp(entryStartZ, LOOP_CENTER_Z, b)
      const yA = LOOP_BASE_Y * (a * a * (3 - 2 * a))
      const yB = LOOP_BASE_Y * (b * b * (3 - 2 * b))
      const dz = zB - zA
      const dy = yB - yA
      const length = Math.hypot(dz, dy) * 1.04
      const angle = Math.atan2(dy, -dz)
      addTrackBox(
        0,
        (yA + yB) * 0.5,
        (zA + zB) * 0.5,
        LOOP_WIDTH,
        LOOP_THICKNESS,
        length,
        angle
      )
    }

    // Full vertical loop. Its bottom is slightly above the asphalt so the
    // dedicated track collider, not the floor, carries the car through it.
    const segmentLength = (2 * Math.PI * LOOP_RADIUS) / LOOP_SEGMENTS * 1.035
    for (let i = 0; i < LOOP_SEGMENTS; i++) {
      const theta = (i / LOOP_SEGMENTS) * Math.PI * 2
      const y = LOOP_BASE_Y + LOOP_RADIUS + LOOP_RADIUS * Math.cos(theta)
      const z = LOOP_CENTER_Z + LOOP_RADIUS * Math.sin(theta)

      addTrackBox(
        0,
        y,
        z,
        LOOP_WIDTH,
        LOOP_THICKNESS,
        segmentLength,
        theta
      )
    }

    // Matching exit on the far side of the loop, descending smoothly back
    // to the asphalt instead of ending as a bare circular ring.
    const exitEndZ = LOOP_CENTER_Z - EXIT_LENGTH
    for (let i = 0; i < TRANSITION_SEGMENTS; i++) {
      const a = i / TRANSITION_SEGMENTS
      const b = (i + 1) / TRANSITION_SEGMENTS
      const zA = THREE.MathUtils.lerp(LOOP_CENTER_Z, exitEndZ, a)
      const zB = THREE.MathUtils.lerp(LOOP_CENTER_Z, exitEndZ, b)
      const easedA = 1 - a
      const easedB = 1 - b
      const yA = LOOP_BASE_Y * (easedA * easedA * (3 - 2 * easedA))
      const yB = LOOP_BASE_Y * (easedB * easedB * (3 - 2 * easedB))
      const dz = zB - zA
      const dy = yB - yA
      const length = Math.hypot(dz, dy) * 1.04
      const angle = Math.atan2(dy, -dz)
      addTrackBox(
        0,
        (yA + yB) * 0.5,
        (zA + zB) * 0.5,
        LOOP_WIDTH,
        LOOP_THICKNESS,
        length,
        angle
      )
    }

    this.scene.add(group)
    this.house = group

    const groundBody = new CANNON.Body({
      mass: 0,
      material: this.physicsWorld.defaultMaterial,
    })
    groundBody.addShape(
      new CANNON.Box(
        new CANNON.Vec3(
          GROUND_SIZE * 0.5,
          GROUND_THICKNESS * 0.5,
          GROUND_SIZE * 0.5
        )
      )
    )
    groundBody.position.set(0, -GROUND_THICKNESS * 0.5, 0)
    groundBody.updateAABB()
    this.physicsWorld.addBody(groundBody)
    this.colliderBody = groundBody

    loopBody.updateAABB()
    this.physicsWorld.addBody(loopBody)
    this.loopBody = loopBody

    this.applyEnvironmentParams()
  }

  applyEnvironmentParams() {
    const { offsetY } = this.environmentParams

    if (this.house) this.house.position.y = offsetY
    if (this.colliderBody) {
      this.colliderBody.position.y = offsetY - GROUND_THICKNESS * 0.5
      this.colliderBody.updateAABB()
    }
    if (this.loopBody) {
      this.loopBody.position.y = offsetY
      this.loopBody.updateAABB()
    }
  }

  update() {
    for (const { body, mesh } of this.dynamicPairs) {
      mesh.position.copy(body.position)
      mesh.quaternion.copy(body.quaternion)
    }
  }
}
