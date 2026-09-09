import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export const DEFAULT_ENVIRONMENT_PARAMS = {
  offsetY: 0,
}

const GROUND_SIZE = 240
const GROUND_THICKNESS = 0.5
const TRACK_RX = 54
const TRACK_RZ = 34
const TRACK_WIDTH = 10
const TRACK_SEGMENTS = 220
const AI_COUNT = 7

// Experimental mix: kart-style circuit + moving AI pack.
// Vehicle.js is intentionally untouched so the RC car keeps its own physics,
// suspension, acceleration, braking, boost and mobile controls.
export class World {
  constructor(scene, physicsWorld, reflectionMap = null) {
    this.scene = scene
    this.physicsWorld = physicsWorld
    this.reflectionMap = reflectionMap
    this.dynamicPairs = []
    this.aiKarts = []
    this.elapsed = 0
    this.environmentParams = { ...DEFAULT_ENVIRONMENT_PARAMS }

    this._createLights()
    this.ready = this._createKartMixWorld()
  }

  _createLights() {
    const hemi = new THREE.HemisphereLight(0xd7ebff, 0x4f5c4f, 2.1)
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

  async _createKartMixWorld() {
    const group = new THREE.Group()
    group.name = 'TurboKartRcMixEnvironment'

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x697078,
      roughness: 0.96,
      metalness: 0,
    })

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
      groundMat
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    group.add(ground)

    const groundBody = new CANNON.Body({ mass: 0 })
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

    // Grass infield gives the scene the quick arcade-kart look while the RC
    // car continues to drive on the same flat physical ground underneath.
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x4f7a3b,
      roughness: 1,
    })
    const grass = new THREE.Mesh(
      new THREE.CircleGeometry(1, TRACK_SEGMENTS),
      grassMat
    )
    const gp = grass.geometry.attributes.position
    for (let i = 0; i < gp.count; i++) {
      gp.setX(i, gp.getX(i) * (TRACK_RX - TRACK_WIDTH * 0.63))
      gp.setY(i, gp.getY(i) * (TRACK_RZ - TRACK_WIDTH * 0.63))
    }
    grass.geometry.attributes.position.needsUpdate = true
    grass.rotation.x = -Math.PI / 2
    grass.position.y = 0.014
    grass.receiveShadow = true
    group.add(grass)

    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x30353a,
      roughness: 0.93,
      metalness: 0,
      side: THREE.DoubleSide,
    })

    const curbRed = new THREE.MeshStandardMaterial({ color: 0xd8473f, roughness: 0.72 })
    const curbWhite = new THREE.MeshStandardMaterial({ color: 0xf2f2ed, roughness: 0.72 })

    const trackGeometry = this._createEllipseRibbon(TRACK_RX, TRACK_RZ, TRACK_WIDTH, TRACK_SEGMENTS)
    const track = new THREE.Mesh(trackGeometry, trackMat)
    track.position.y = 0.025
    track.receiveShadow = true
    group.add(track)

    // Alternating red/white kerbs around both edges.
    const kerbPieces = 52
    for (let i = 0; i < kerbPieces; i++) {
      const t = (i / kerbPieces) * Math.PI * 2
      const next = ((i + 1) / kerbPieces) * Math.PI * 2
      const mat = i % 2 === 0 ? curbRed : curbWhite
      this._addKerbPiece(group, t, next, 1, mat)
      this._addKerbPiece(group, t, next, -1, mat)
    }

    // Start / finish checker stripe on the near straight.
    const checkerGroup = new THREE.Group()
    const tileSize = 1.15
    for (let x = -TRACK_WIDTH * 0.5; x < TRACK_WIDTH * 0.5; x += tileSize) {
      for (let z = -1.15; z <= 1.15; z += tileSize) {
        const parity = (Math.round((x + TRACK_WIDTH * 0.5) / tileSize) + Math.round((z + 1.15) / tileSize)) % 2
        const tile = new THREE.Mesh(
          new THREE.PlaneGeometry(tileSize, tileSize),
          new THREE.MeshBasicMaterial({ color: parity ? 0xffffff : 0x171717 })
        )
        tile.rotation.x = -Math.PI / 2
        tile.position.set(x, 0.055, TRACK_RZ + z)
        checkerGroup.add(tile)
      }
    }
    group.add(checkerGroup)

    this._createTrackDecorations(group)
    this._createAiKarts(group)

    this.scene.add(group)
    this.house = group
    this.applyEnvironmentParams()
  }

  _createEllipseRibbon(rx, rz, width, segments) {
    const positions = []
    const indices = []
    const half = width * 0.5

    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2
      const c = Math.cos(t)
      const s = Math.sin(t)
      const px = rx * c
      const pz = rz * s

      const nx = c / rx
      const nz = s / rz
      const inv = 1 / Math.hypot(nx, nz)
      const ox = nx * inv * half
      const oz = nz * inv * half

      positions.push(px - ox, 0, pz - oz)
      positions.push(px + ox, 0, pz + oz)
    }

    for (let i = 0; i < segments; i++) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }

  _addKerbPiece(group, t0, t1, edgeSign, material) {
    const samples = 4
    const width = 0.72
    const positions = []
    const indices = []

    for (let i = 0; i <= samples; i++) {
      const t = THREE.MathUtils.lerp(t0, t1, i / samples)
      const c = Math.cos(t)
      const s = Math.sin(t)
      const nx0 = c / TRACK_RX
      const nz0 = s / TRACK_RZ
      const inv = 1 / Math.hypot(nx0, nz0)
      const nx = nx0 * inv
      const nz = nz0 * inv
      const edge = edgeSign * TRACK_WIDTH * 0.5
      const centerX = TRACK_RX * c + nx * edge
      const centerZ = TRACK_RZ * s + nz * edge
      const w = width * 0.5
      positions.push(centerX - nx * w, 0.045, centerZ - nz * w)
      positions.push(centerX + nx * w, 0.045, centerZ + nz * w)
    }

    for (let i = 0; i < samples; i++) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    const mesh = new THREE.Mesh(geo, material)
    mesh.receiveShadow = true
    group.add(mesh)
  }

  _createTrackDecorations(group) {
    const tyreMat = new THREE.MeshStandardMaterial({ color: 0x17191c, roughness: 0.88 })
    const postMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.8 })

    // Tire stacks around the outside edge.
    for (let i = 0; i < 38; i++) {
      const t = (i / 38) * Math.PI * 2
      const x = Math.cos(t) * (TRACK_RX + TRACK_WIDTH * 0.75 + 2.2)
      const z = Math.sin(t) * (TRACK_RZ + TRACK_WIDTH * 0.75 + 2.2)
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.18, 8, 16), tyreMat)
      tyre.rotation.x = Math.PI / 2
      tyre.position.set(x, 0.34, z)
      tyre.castShadow = true
      tyre.receiveShadow = true
      group.add(tyre)
    }

    // Simple start gantry.
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.7, 5.4, 0.7), postMat)
    const right = left.clone()
    left.position.set(-TRACK_WIDTH * 0.75, 2.7, TRACK_RZ)
    right.position.set(TRACK_WIDTH * 0.75, 2.7, TRACK_RZ)
    const top = new THREE.Mesh(new THREE.BoxGeometry(TRACK_WIDTH * 1.6, 0.7, 0.7), postMat)
    top.position.set(0, 5.05, TRACK_RZ)
    group.add(left, right, top)
  }

  _createAiKarts(group) {
    const colors = [0xff4d4d, 0x33a7ff, 0xffcf33, 0x8c5cff, 0x36d67e, 0xff7a30, 0xf25ee5]

    for (let i = 0; i < AI_COUNT; i++) {
      const kart = new THREE.Group()
      const bodyMat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.58, metalness: 0.12 })
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x17191d, roughness: 0.82 })

      const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.72, 3.4), bodyMat)
      body.position.y = 0.7
      body.castShadow = true
      kart.add(body)

      const nose = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.34, 1.35), bodyMat)
      nose.position.set(0, 0.63, -2.08)
      nose.castShadow = true
      kart.add(nose)

      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.62, 1.05), darkMat)
      seat.position.set(0, 1.16, 0.25)
      seat.castShadow = true
      kart.add(seat)

      const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.36, 14)
      const wheelOffsets = [
        [-1.18, 0.45, -1.18], [1.18, 0.45, -1.18],
        [-1.18, 0.45, 1.2], [1.18, 0.45, 1.2],
      ]
      for (const [x, y, z] of wheelOffsets) {
        const wheel = new THREE.Mesh(wheelGeo, darkMat)
        wheel.rotation.z = Math.PI / 2
        wheel.position.set(x, y, z)
        wheel.castShadow = true
        kart.add(wheel)
      }

      group.add(kart)
      this.aiKarts.push({
        mesh: kart,
        phase: (i / AI_COUNT) * Math.PI * 2,
        speed: 0.21 + (i % 3) * 0.012,
        laneOffset: (i % 2 === 0 ? -1 : 1) * (1.0 + (i % 3) * 0.55),
      })
    }
  }

  _updateAiKarts(dt) {
    this.elapsed += dt

    for (const ai of this.aiKarts) {
      const t = ai.phase + this.elapsed * ai.speed
      const c = Math.cos(t)
      const s = Math.sin(t)
      const nx0 = c / TRACK_RX
      const nz0 = s / TRACK_RZ
      const inv = 1 / Math.hypot(nx0, nz0)
      const nx = nx0 * inv
      const nz = nz0 * inv

      const x = TRACK_RX * c + nx * ai.laneOffset
      const z = TRACK_RZ * s + nz * ai.laneOffset
      ai.mesh.position.set(x, 0.03, z)

      const tangentX = -TRACK_RX * s
      const tangentZ = TRACK_RZ * c
      ai.mesh.rotation.y = Math.atan2(tangentX, tangentZ)
    }
  }

  applyEnvironmentParams() {
    const { offsetY } = this.environmentParams
    if (this.house) this.house.position.y = offsetY
    if (this.colliderBody) {
      this.colliderBody.position.y = offsetY - GROUND_THICKNESS * 0.5
      this.colliderBody.updateAABB()
    }
  }

  update(dt = 1 / 60) {
    this._updateAiKarts(Math.min(dt || 1 / 60, 0.05))

    for (const { body, mesh } of this.dynamicPairs) {
      mesh.position.copy(body.position)
      mesh.quaternion.copy(body.quaternion)
    }
  }
}
