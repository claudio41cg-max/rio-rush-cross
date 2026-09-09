import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export const DEFAULT_ENVIRONMENT_PARAMS = {
  offsetY: 0,
}

const GROUND_SIZE = 300
const GROUND_THICKNESS = 0.5

// Scenario-only stunt loop. Vehicle.js, controls, camera and driving physics
// are intentionally untouched.
const LOOP_RADIUS = 11
const LOOP_WIDTH = 7
const LOOP_THICKNESS = 0.65
const LOOP_SEGMENTS = 56
const LOOP_Z = -34

export class World {
  constructor(scene, physicsWorld, reflectionMap = null) {
    this.scene = scene
    this.physicsWorld = physicsWorld
    this.reflectionMap = reflectionMap
    this.dynamicPairs = []
    this.environmentParams = { ...DEFAULT_ENVIRONMENT_PARAMS }

    this._createLights()
    this.ready = this._createFlatEnvironmentWithLoop()
  }

  _createLights() {
    const hemi = new THREE.HemisphereLight(0xcfe5ff, 0x5a5036, 2)
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

  async _createFlatEnvironmentWithLoop() {
    const group = new THREE.Group()
    group.name = 'RioRushFlatLoopEnvironment'

    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x8d929b,
      roughness: 0.94,
      metalness: 0,
    })

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
      groundMaterial
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0
    ground.receiveShadow = true
    group.add(ground)

    // Subtle grid lines are visual only; the physical floor remains perfectly flat.
    const grid = new THREE.GridHelper(GROUND_SIZE, 60, 0xcbd0d8, 0xb0b5bd)
    grid.position.y = 0.012
    group.add(grid)

    const loopMaterial = new THREE.MeshStandardMaterial({
      color: 0x1656d8,
      roughness: 0.42,
      metalness: 0.08,
      side: THREE.DoubleSide,
    })

    // A single vertical loop aligned with the original forward/back driving axis.
    // Each segment is both a visible ramp piece and a matching static Cannon box.
    const loopBody = new CANNON.Body({
      mass: 0,
      material: this.physicsWorld.defaultMaterial,
    })

    const segmentLength = (2 * Math.PI * LOOP_RADIUS) / LOOP_SEGMENTS * 1.035
    for (let i = 0; i < LOOP_SEGMENTS; i++) {
      const theta = (i / LOOP_SEGMENTS) * Math.PI * 2
      const y = LOOP_RADIUS + LOOP_RADIUS * Math.cos(theta)
      const z = LOOP_Z + LOOP_RADIUS * Math.sin(theta)

      const segment = new THREE.Mesh(
        new THREE.BoxGeometry(LOOP_WIDTH, LOOP_THICKNESS, segmentLength),
        loopMaterial
      )
      segment.position.set(0, y, z)
      segment.rotation.x = theta
      segment.castShadow = true
      segment.receiveShadow = true
      group.add(segment)

      const shape = new CANNON.Box(
        new CANNON.Vec3(LOOP_WIDTH * 0.5, LOOP_THICKNESS * 0.5, segmentLength * 0.5)
      )
      const localOffset = new CANNON.Vec3(0, y, z)
      const localRotation = new CANNON.Quaternion()
      localRotation.setFromEuler(theta, 0, 0)
      loopBody.addShape(shape, localOffset, localRotation)
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
