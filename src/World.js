import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export const DEFAULT_ENVIRONMENT_PARAMS = {
  offsetY: 0,
}

const TRACK_WIDTH = 13
const TRACK_SAMPLES = 260
const GROUND_Y = -1.2

function wrappedDistance(a, b) {
  const d = Math.abs(a - b)
  return Math.min(d, 1 - d)
}

function smoothBump(t, center, halfWidth, height) {
  const d = wrappedDistance(t, center)
  if (d >= halfWidth) return 0
  const x = d / halfWidth
  return height * (0.5 + 0.5 * Math.cos(Math.PI * x))
}

function trackHeight(t) {
  // Keep the start straight almost flat, then add long climbs and compact jumps.
  let y = 0
  y += smoothBump(t, 0.15, 0.09, 4.2)
  y += smoothBump(t, 0.31, 0.07, 2.6)
  y += smoothBump(t, 0.48, 0.11, 6.0)
  y += smoothBump(t, 0.67, 0.08, 3.8)
  y += smoothBump(t, 0.82, 0.09, 5.2)

  // Short motocross-style launch crests layered over the larger terrain.
  y += smoothBump(t, 0.105, 0.018, 1.8)
  y += smoothBump(t, 0.265, 0.020, 2.2)
  y += smoothBump(t, 0.565, 0.018, 2.4)
  y += smoothBump(t, 0.735, 0.020, 2.0)
  y += smoothBump(t, 0.905, 0.018, 1.8)
  return y
}

export class World {
  constructor(scene, physicsWorld, reflectionMap = null) {
    this.scene = scene
    this.physicsWorld = physicsWorld
    this.reflectionMap = reflectionMap
    this.dynamicPairs = []
    this.environmentParams = { ...DEFAULT_ENVIRONMENT_PARAMS }

    this._createLights()
    this.ready = this._createMotocrossEnvironment()
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

  async _createMotocrossEnvironment() {
    const group = new THREE.Group()
    group.name = 'RioRushMotocrossEnvironment'

    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x6f6a43,
      roughness: 1,
      metalness: 0,
    })
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(230, 190), groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = GROUND_Y
    ground.receiveShadow = true
    group.add(ground)

    // Irregular closed loop. It starts at the world origin so the original car
    // spawn and driving code can remain untouched.
    const centerline = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(4, 0, 28),
        new THREE.Vector3(25, 0, 49),
        new THREE.Vector3(56, 0, 52),
        new THREE.Vector3(76, 0, 29),
        new THREE.Vector3(78, 0, -5),
        new THREE.Vector3(60, 0, -35),
        new THREE.Vector3(28, 0, -48),
        new THREE.Vector3(-8, 0, -44),
        new THREE.Vector3(-38, 0, -30),
        new THREE.Vector3(-58, 0, -4),
        new THREE.Vector3(-53, 0, 25),
        new THREE.Vector3(-30, 0, 45),
        new THREE.Vector3(-7, 0, 33),
      ],
      true,
      'catmullrom',
      0.28
    )

    const positions = []
    const uvs = []
    const indices = []
    const sampleData = []
    const up = new THREE.Vector3(0, 1, 0)

    for (let i = 0; i < TRACK_SAMPLES; i++) {
      const t = i / TRACK_SAMPLES
      const p = centerline.getPointAt(t)
      p.y = trackHeight(t)

      const tangent = centerline.getTangentAt(t).normalize()
      tangent.y = 0
      tangent.normalize()
      const side = new THREE.Vector3().crossVectors(up, tangent).normalize()

      const left = p.clone().addScaledVector(side, TRACK_WIDTH * 0.5)
      const right = p.clone().addScaledVector(side, -TRACK_WIDTH * 0.5)

      // Slight crowned center-to-edge profile gives the dirt track more shape.
      left.y -= 0.14
      right.y -= 0.14

      positions.push(left.x, left.y, left.z, right.x, right.y, right.z)
      uvs.push(0, t * 18, 1, t * 18)
      sampleData.push({ t, p, tangent, side, left, right })
    }

    for (let i = 0; i < TRACK_SAMPLES; i++) {
      const j = (i + 1) % TRACK_SAMPLES
      const li = i * 2
      const ri = li + 1
      const lj = j * 2
      const rj = lj + 1
      indices.push(li, ri, lj, ri, rj, lj)
    }

    const trackGeometry = new THREE.BufferGeometry()
    trackGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    trackGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    trackGeometry.setIndex(indices)
    trackGeometry.computeVertexNormals()

    const dirtMaterial = new THREE.MeshStandardMaterial({
      color: 0x8a5633,
      roughness: 0.98,
      metalness: 0,
    })
    const track = new THREE.Mesh(trackGeometry, dirtMaterial)
    track.name = 'MotocrossTrack'
    track.castShadow = true
    track.receiveShadow = true
    group.add(track)

    // Darker compacted racing line down the middle.
    const racingPoints = []
    for (let i = 0; i < TRACK_SAMPLES; i++) {
      const t = i / TRACK_SAMPLES
      const p = centerline.getPointAt(t)
      p.y = trackHeight(t) + 0.035
      racingPoints.push(p)
    }
    const racingCurve = new THREE.CatmullRomCurve3(racingPoints, true, 'catmullrom', 0.2)
    const lineGeometry = new THREE.TubeGeometry(racingCurve, TRACK_SAMPLES, 0.34, 5, true)
    const lineMaterial = new THREE.MeshStandardMaterial({
      color: 0x5f3925,
      roughness: 1,
      metalness: 0,
    })
    const racingLine = new THREE.Mesh(lineGeometry, lineMaterial)
    racingLine.receiveShadow = true
    group.add(racingLine)

    // Low dirt berms around selected corners.
    const bermMaterial = new THREE.MeshStandardMaterial({
      color: 0x7a472d,
      roughness: 1,
    })
    const bermSections = [0.22, 0.39, 0.59, 0.78]
    for (const center of bermSections) {
      for (let k = -5; k <= 5; k++) {
        const t = (center + k * 0.006 + 1) % 1
        const p = centerline.getPointAt(t)
        p.y = trackHeight(t)
        const tangent = centerline.getTangentAt(t).setY(0).normalize()
        const side = new THREE.Vector3().crossVectors(up, tangent).normalize()
        const outside = p.clone().addScaledVector(side, TRACK_WIDTH * 0.62)
        outside.y += 0.45 + (1 - Math.abs(k) / 6) * 0.5

        const mound = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 6), bermMaterial)
        mound.scale.set(1.7, 0.55, 1.1)
        mound.position.copy(outside)
        mound.castShadow = true
        mound.receiveShadow = true
        group.add(mound)
      }
    }

    // Trackside marker posts make speed and cornering easier to read on mobile.
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0xe6e1cf, roughness: 0.8 })
    for (let i = 0; i < TRACK_SAMPLES; i += 13) {
      const s = sampleData[i]
      for (const sign of [-1, 1]) {
        const pos = s.p.clone().addScaledVector(s.side, sign * (TRACK_WIDTH * 0.72))
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.9, 7), postMaterial)
        post.position.set(pos.x, s.p.y + 0.85, pos.z)
        post.castShadow = true
        group.add(post)
      }
    }

    this.scene.add(group)
    this.house = group

    const colliderBody = new CANNON.Body({
      mass: 0,
      material: this.physicsWorld.defaultMaterial,
    })
    colliderBody.addShape(new CANNON.Trimesh(positions, indices))
    colliderBody.updateAABB()
    this.physicsWorld.addBody(colliderBody)
    this.colliderBody = colliderBody

    // Recovery ground outside the track, slightly below the racing surface.
    const groundBody = new CANNON.Body({
      mass: 0,
      material: this.physicsWorld.defaultMaterial,
    })
    const groundPlane = new CANNON.Plane()
    const groundRotation = new CANNON.Quaternion()
    groundRotation.setFromEuler(-Math.PI / 2, 0, 0)
    groundBody.addShape(groundPlane, new CANNON.Vec3(0, GROUND_Y, 0), groundRotation)
    this.physicsWorld.addBody(groundBody)
    this.groundBody = groundBody

    this.applyEnvironmentParams()
  }

  applyEnvironmentParams() {
    const { offsetY } = this.environmentParams
    if (this.house) this.house.position.y = offsetY
    if (this.colliderBody) {
      this.colliderBody.position.y = offsetY
      this.colliderBody.updateAABB()
    }
    if (this.groundBody) {
      this.groundBody.position.y = offsetY
      this.groundBody.updateAABB()
    }
  }

  update() {
    for (const { body, mesh } of this.dynamicPairs) {
      mesh.position.copy(body.position)
      mesh.quaternion.copy(body.quaternion)
    }
  }
}
