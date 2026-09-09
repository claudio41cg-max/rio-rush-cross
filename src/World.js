import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export const DEFAULT_ENVIRONMENT_PARAMS = {
  offsetY: 0,
}

const GROUND_SIZE = 300
const GROUND_THICKNESS = 0.5

// Scenario only. Vehicle.js and the original driving mechanics remain untouched.
const LOOP_RADIUS = 14
const LOOP_WIDTH = 7.2
const LOOP_SEGMENTS = 240
const LOOP_CENTER_Z = -42
const APPROACH_LENGTH = 34
const APPROACH_SEGMENTS = 72

export class World {
  constructor(scene, physicsWorld, reflectionMap = null) {
    this.scene = scene
    this.physicsWorld = physicsWorld
    this.reflectionMap = reflectionMap
    this.dynamicPairs = []
    this.environmentParams = { ...DEFAULT_ENVIRONMENT_PARAMS }

    this._createLights()
    this.ready = this._createAsphaltWithContinuousLoop()
  }

  _createLights() {
    const hemi = new THREE.HemisphereLight(0xcfe5ff, 0x56595e, 2)
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

  async _createAsphaltWithContinuousLoop() {
    const group = new THREE.Group()
    group.name = 'RioRushContinuousLoopEnvironment'

    const asphaltMaterial = new THREE.MeshStandardMaterial({
      color: 0x777b80,
      roughness: 0.97,
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

    const trackMaterial = new THREE.MeshStandardMaterial({
      color: 0x1557dc,
      roughness: 0.36,
      metalness: 0.07,
      side: THREE.DoubleSide,
    })

    const halfWidth = LOOP_WIDTH * 0.5
    const points = []

    // Entry: a real straight approach that is flush with the asphalt and
    // arrives exactly at the bottom tangent of the loop.
    for (let i = 0; i <= APPROACH_SEGMENTS; i++) {
      const t = i / APPROACH_SEGMENTS
      const z = THREE.MathUtils.lerp(
        LOOP_CENTER_Z + APPROACH_LENGTH,
        LOOP_CENTER_Z,
        t
      )
      points.push({ y: 0.01, z })
    }

    // Full circular loop. The first point is the same bottom tangent reached
    // by the entry and the last point returns to it ready for the exit.
    for (let i = 1; i <= LOOP_SEGMENTS; i++) {
      const angle = (i / LOOP_SEGMENTS) * Math.PI * 2
      points.push({
        y: LOOP_RADIUS - LOOP_RADIUS * Math.cos(angle) + 0.01,
        z: LOOP_CENTER_Z - LOOP_RADIUS * Math.sin(angle),
      })
    }

    // Exit: continues from the same bottom tangent toward the opposite side.
    for (let i = 1; i <= APPROACH_SEGMENTS; i++) {
      const t = i / APPROACH_SEGMENTS
      const z = THREE.MathUtils.lerp(
        LOOP_CENTER_Z,
        LOOP_CENTER_Z - APPROACH_LENGTH,
        t
      )
      points.push({ y: 0.01, z })
    }

    const positions = []
    const indices = []

    for (const point of points) {
      positions.push(-halfWidth, point.y, point.z)
      positions.push(halfWidth, point.y, point.z)
    }

    for (let i = 0; i < points.length - 1; i++) {
      const a = i * 2
      const b = (i + 1) * 2
      indices.push(a, a + 1, b, a + 1, b + 1, b)
    }

    const loopGeometry = new THREE.BufferGeometry()
    loopGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    )
    loopGeometry.setIndex(indices)
    loopGeometry.computeVertexNormals()

    const loopMesh = new THREE.Mesh(loopGeometry, trackMaterial)
    loopMesh.name = 'ContinuousLoopWithEntryAndExit'
    loopMesh.castShadow = true
    loopMesh.receiveShadow = true
    group.add(loopMesh)

    // One matching continuous collider: there are no box edges or separate
    // blue strips for the tyres to hit on the way in or out.
    const loopBody = new CANNON.Body({
      mass: 0,
      material: this.physicsWorld.defaultMaterial,
    })
    this._addTrimeshColliderShape(loopBody, loopGeometry)

    this.scene.add(group)
    this.house = group

    loopBody.updateAABB()
    this.physicsWorld.addBody(loopBody)
    this.loopBody = loopBody

    this.applyEnvironmentParams()
  }

  _addTrimeshColliderShape(body, geometry) {
    const position = geometry?.attributes?.position
    if (!position || position.count < 3) return 0
    if (position.count > 32767) return 0

    const vertices = new Array(position.count * 3)
    for (let i = 0; i < position.count; i++) {
      vertices[i * 3] = position.getX(i)
      vertices[i * 3 + 1] = position.getY(i)
      vertices[i * 3 + 2] = position.getZ(i)
    }

    const indices = geometry.index
      ? Array.from(geometry.index.array)
      : Array.from({ length: position.count }, (_, i) => i)

    body.addShape(new CANNON.Trimesh(vertices, indices))
    return 1
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
