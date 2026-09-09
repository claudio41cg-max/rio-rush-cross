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
const LOOP_TARGET_Z = -40

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
    const hemi = new THREE.HemisphereLight(0xcfe5ff, 0x4f5358, 2)
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
    group.name = 'RioRushOriginalLoopEnvironment'

    const asphaltMaterial = new THREE.MeshStandardMaterial({
      color: 0x666a70,
      roughness: 0.96,
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

      // The original loop is the tall, compact stunt structure in the level.
      // Flat floor pieces and long ramps score much lower.
      const horizontalSpan = Math.max(size.x, size.z, 0.001)
      const compactness = size.y / horizontalSpan
      const score = nameBonus + size.y * 20 + compactness * 100 - horizontalSpan * 0.35

      meshInfos.push({ mesh, box, size, center, score, name })
    })

    if (meshInfos.length === 0) {
      throw new Error('The original rc-level.glb contains no usable meshes')
    }

    meshInfos.sort((a, b) => b.score - a.score)
    const anchor = meshInfos[0]

    const anchorHorizontalSpan = Math.max(anchor.size.x, anchor.size.z)
    const keepRadius = Math.max(16, anchorHorizontalSpan * 1.25)

    // Keep the real loop plus the original pieces immediately connected to it,
    // which preserves its proper entrance and exit. Everything else is omitted.
    let selected = meshInfos.filter((info) => {
      if (/loop|ring|circle|stunt/.test(info.name)) return true

      const dx = info.center.x - anchor.center.x
      const dz = info.center.z - anchor.center.z
      const horizontalDistance = Math.hypot(dx, dz)
      const nearLoop = horizontalDistance <= keepRadius
      const verticallyRelevant = info.box.max.y >= anchor.box.min.y - 2.5
      const notHugeFloor = info.size.y > 0.35 || info.size.x < 45 || info.size.z < 45

      return nearLoop && verticallyRelevant && notHugeFloor
    })

    if (selected.length === 0) selected = [anchor]

    const selectionBox = new THREE.Box3()
    for (const info of selected) selectionBox.union(info.box)

    const selectionCenter = selectionBox.getCenter(new THREE.Vector3())
    const selectionBottom = selectionBox.min.y
    const worldOffset = new THREE.Vector3(
      -selectionCenter.x,
      -selectionBottom + 0.04,
      LOOP_TARGET_Z - selectionCenter.z
    )

    const loopVisualGroup = new THREE.Group()
    loopVisualGroup.name = 'OriginalLoopOnly'

    const loopBody = new CANNON.Body({
      mass: 0,
      material: this.physicsWorld.defaultMaterial,
    })

    let colliderShapes = 0

    for (const { mesh } of selected) {
      const geometry = mesh.geometry.clone()
      geometry.applyMatrix4(mesh.matrixWorld)
      geometry.translate(worldOffset.x, worldOffset.y, worldOffset.z)

      const materials = Array.isArray(mesh.material)
        ? mesh.material.map((m) => m?.clone?.() ?? m)
        : mesh.material?.clone?.() ?? mesh.material

      const visual = new THREE.Mesh(geometry, materials)
      visual.name = mesh.name || 'OriginalLoopPart'
      visual.castShadow = true
      visual.receiveShadow = true
      loopVisualGroup.add(visual)

      colliderShapes += this._addTrimeshColliderShape(loopBody, geometry)
    }

    if (colliderShapes === 0) {
      throw new Error('Could not create collision for the original loop')
    }

    group.add(loopVisualGroup)
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

    // Keep each imported mesh within cannon-es' safe vertex range.
    if (position.count > 32767) {
      console.warn('Original loop mesh is too large for a safe Trimesh collider')
      return 0
    }

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
