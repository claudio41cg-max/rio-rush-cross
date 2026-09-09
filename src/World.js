import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

import levelUrl from './assets/rc-level.glb?url'

export const DEFAULT_ENVIRONMENT_PARAMS = {
  offsetY: 0,
}

const GROUND_SIZE = 300
const GROUND_THICKNESS = 0.5
const ORIGINAL_LEVEL_SCALE = 3
const LOOP_SCALE = 1.12
const LOOP_TARGET_Z = -40
const ACCESS_LENGTH = 24
const ACCESS_STEPS = 48

export class World {
  constructor(scene, physicsWorld, reflectionMap = null) {
    this.scene = scene
    this.physicsWorld = physicsWorld
    this.reflectionMap = reflectionMap
    this.dynamicPairs = []
    this.environmentParams = { ...DEFAULT_ENVIRONMENT_PARAMS }

    this._createLights()
    this.ready = this._createAsphaltWithOriginalLoop()
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

  async _createAsphaltWithOriginalLoop() {
    const group = new THREE.Group()
    group.name = 'RioRushLoopOnlyEnvironment'

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

    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync(levelUrl)
    const original = gltf.scene
    original.scale.setScalar(ORIGINAL_LEVEL_SCALE)
    original.updateMatrixWorld(true)

    const meshInfos = []
    original.traverse((mesh) => {
      if (!mesh.isMesh || !mesh.geometry?.attributes?.position) return

      const box = new THREE.Box3().setFromObject(mesh)
      if (box.isEmpty()) return

      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const name = `${mesh.name} ${mesh.parent?.name ?? ''}`.toLowerCase()
      const nameBonus = /loop|ring|circle|stunt/.test(name) ? 1000 : 0
      const horizontalSpan = Math.max(size.x, size.z, 0.001)
      const compactness = size.y / horizontalSpan
      const score = nameBonus + size.y * 20 + compactness * 100 - horizontalSpan * 0.35

      meshInfos.push({ mesh, box, size, center, score })
    })

    if (meshInfos.length === 0) {
      throw new Error('The original rc-level.glb contains no usable meshes')
    }

    meshInfos.sort((a, b) => b.score - a.score)
    const anchor = meshInfos[0]

    // Use the real original loop mesh as the reference instead of rebuilding it from blocks.
    const loopGeometry = anchor.mesh.geometry.clone()
    loopGeometry.applyMatrix4(anchor.mesh.matrixWorld)

    const originalLoopBox = new THREE.Box3().setFromBufferAttribute(loopGeometry.attributes.position)
    const originalCenter = originalLoopBox.getCenter(new THREE.Vector3())
    const originalBottom = originalLoopBox.min.y

    loopGeometry.translate(-originalCenter.x, -originalBottom, -originalCenter.z)
    loopGeometry.scale(LOOP_SCALE, LOOP_SCALE, LOOP_SCALE)
    loopGeometry.translate(0, 0.018, LOOP_TARGET_Z)
    loopGeometry.computeVertexNormals()

    const loopMaterial = new THREE.MeshStandardMaterial({
      color: 0x1557dc,
      roughness: 0.38,
      metalness: 0.08,
      side: THREE.DoubleSide,
    })

    const loopVisual = new THREE.Mesh(loopGeometry, loopMaterial)
    loopVisual.name = 'OriginalLoopOnly'
    loopVisual.castShadow = true
    loopVisual.receiveShadow = true
    group.add(loopVisual)

    const loopBody = new CANNON.Body({
      mass: 0,
      material: this.physicsWorld.defaultMaterial,
    })
    this._addTrimeshColliderShape(loopBody, loopGeometry)

    const loopBox = new THREE.Box3().setFromBufferAttribute(loopGeometry.attributes.position)
    const loopSize = loopBox.getSize(new THREE.Vector3())
    const loopCenter = loopBox.getCenter(new THREE.Vector3())

    // Infer which horizontal axis the car travels through the original loop.
    const travelAlongX = Math.abs(loopSize.x - loopSize.y) < Math.abs(loopSize.z - loopSize.y)
    const halfTravelSpan = (travelAlongX ? loopSize.x : loopSize.z) * 0.5
    const crossSpan = travelAlongX ? loopSize.z : loopSize.x
    const accessWidth = THREE.MathUtils.clamp(crossSpan * 0.82, 5.5, 8.5)

    const accessMaterial = new THREE.MeshStandardMaterial({
      color: 0x1557dc,
      roughness: 0.4,
      metalness: 0.06,
      side: THREE.DoubleSide,
    })

    // A zero-thickness driving surface avoids the vertical front wall that was
    // stopping the tyres. It starts exactly at asphalt height and rises smoothly
    // into the bottom tangent of the loop. The exit is the mirrored surface.
    const createAccessSurface = (side) => {
      const positions = []
      const indices = []
      const halfWidth = accessWidth * 0.5
      const joinTravel = side * halfTravelSpan
      const outerTravel = side * (halfTravelSpan + ACCESS_LENGTH)

      for (let i = 0; i <= ACCESS_STEPS; i++) {
        const t = i / ACCESS_STEPS
        // t=0 is the asphalt end; t=1 meets the loop.
        const smooth = t * t * (3 - 2 * t)
        const travel = THREE.MathUtils.lerp(outerTravel, joinTravel, t)
        // Start flush with asphalt. Only a tiny lift at the loop prevents z-fighting.
        const y = THREE.MathUtils.lerp(0.006, 0.022, smooth)

        if (travelAlongX) {
          const x = loopCenter.x + travel
          positions.push(x, y, loopCenter.z - halfWidth)
          positions.push(x, y, loopCenter.z + halfWidth)
        } else {
          const z = loopCenter.z + travel
          positions.push(loopCenter.x - halfWidth, y, z)
          positions.push(loopCenter.x + halfWidth, y, z)
        }
      }

      for (let i = 0; i < ACCESS_STEPS; i++) {
        const a = i * 2
        const b = (i + 1) * 2
        indices.push(a, a + 1, b, a + 1, b + 1, b)
      }

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geometry.setIndex(indices)
      geometry.computeVertexNormals()

      const mesh = new THREE.Mesh(geometry, accessMaterial)
      mesh.name = side < 0 ? 'LoopEntrance' : 'LoopExit'
      mesh.receiveShadow = true
      group.add(mesh)

      this._addTrimeshColliderShape(loopBody, geometry)
    }

    createAccessSurface(-1)
    createAccessSurface(1)

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
