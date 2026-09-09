import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export const DEFAULT_ENVIRONMENT_PARAMS = {
  offsetY: 0,
}

const GROUND_SIZE = 300
const GROUND_THICKNESS = 0.5

/**
 * Clean test environment.
 *
 * The vehicle, controls, camera and driving physics remain untouched.
 * This world intentionally contains only one large flat floor so we can
 * verify the original car behavior before building the motocross track.
 */
export class World {
  constructor(scene, physicsWorld, reflectionMap = null) {
    this.scene = scene
    this.physicsWorld = physicsWorld
    this.reflectionMap = reflectionMap
    this.dynamicPairs = []
    this.environmentParams = { ...DEFAULT_ENVIRONMENT_PARAMS }

    this._createLights()
    this.ready = this._createFlatEnvironment()
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

  async _createFlatEnvironment() {
    const group = new THREE.Group()
    group.name = 'RioRushFlatTestEnvironment'

    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x8a6847,
      roughness: 1,
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

    this.scene.add(group)
    this.house = group

    // Use a thin static box instead of a Cannon Plane. RaycastVehicle wheels
    // raycast reliably against boxes, keeping the original vehicle behavior.
    const body = new CANNON.Body({
      mass: 0,
      material: this.physicsWorld.defaultMaterial,
    })
    body.addShape(
      new CANNON.Box(
        new CANNON.Vec3(
          GROUND_SIZE * 0.5,
          GROUND_THICKNESS * 0.5,
          GROUND_SIZE * 0.5
        )
      )
    )
    body.position.set(0, -GROUND_THICKNESS * 0.5, 0)
    body.updateAABB()
    this.physicsWorld.addBody(body)
    this.colliderBody = body

    this.applyEnvironmentParams()
  }

  applyEnvironmentParams() {
    const { offsetY } = this.environmentParams

    if (this.house) this.house.position.y = offsetY
    if (this.colliderBody) {
      this.colliderBody.position.y = offsetY - GROUND_THICKNESS * 0.5
      this.colliderBody.updateAABB()
    }
  }

  update() {
    for (const { body, mesh } of this.dynamicPairs) {
      mesh.position.copy(body.position)
      mesh.quaternion.copy(body.quaternion)
    }
  }
}
