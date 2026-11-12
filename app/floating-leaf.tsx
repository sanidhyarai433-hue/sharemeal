'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { motion, useReducedMotion } from 'motion/react'

function createLeafShape() {
  const shape = new THREE.Shape()
  shape.moveTo(0, -1.05)
  shape.bezierCurveTo(-0.15, -0.34, -1.04, 0.34, 0, 1.08)
  shape.bezierCurveTo(1.04, 0.34, 0.15, -0.34, 0, -1.05)
  return shape
}

export default function FloatingLeaf() {
  const hostRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const [webglActive, setWebglActive] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let observer: IntersectionObserver | undefined
    let renderer: THREE.WebGLRenderer | undefined
    let scene: THREE.Scene | undefined
    let camera: THREE.PerspectiveCamera | undefined
    let leaf: THREE.Group | undefined
    let pointerX = 0
    let pointerY = 0
    let targetX = 0
    let targetY = 0
    let disposed = false

    const onPointerMove = (event: PointerEvent) => {
      const bounds = host.getBoundingClientRect()
      targetY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.24
      targetX = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.16
    }

    const render = () => {
      if (!renderer || !scene || !camera || !leaf || disposed) return
      if (!prefersReducedMotion) {
        pointerX += (targetX - pointerX) * 0.045
        pointerY += (targetY - pointerY) * 0.045
        leaf.rotation.x = pointerX + Math.sin(performance.now() * 0.00045) * 0.035
        leaf.rotation.y = pointerY + Math.sin(performance.now() * 0.00055) * 0.16
        leaf.rotation.z = Math.sin(performance.now() * 0.00035) * 0.035
      }
      renderer.render(scene, camera)
    }

    const mountScene = () => {
      if (renderer || disposed) return
      const canvas = document.createElement('canvas')
      canvas.setAttribute('aria-hidden', 'true')
      canvas.style.width = '112px'
      canvas.style.height = '112px'
      canvas.style.position = 'absolute'
      canvas.style.inset = '0'
      canvas.style.zIndex = '1'
      host.append(canvas)
      try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' })
        setWebglActive(true)
      } catch {
        canvas.remove()
        return
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
      renderer.setSize(112, 112, false)
      renderer.setClearColor(0x000000, 0)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20)
      camera.position.set(0, 0, 4.5)
      leaf = new THREE.Group()
      const geometry = new THREE.ExtrudeGeometry(createLeafShape(), { depth: 0.13, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.035, bevelThickness: 0.035, curveSegments: 12 })
      geometry.center()
      const material = new THREE.MeshPhysicalMaterial({ color: '#80a97e', roughness: 0.48, metalness: 0.015, clearcoat: 0.32, side: THREE.DoubleSide })
      const blade = new THREE.Mesh(geometry, material)
      blade.rotation.x = -0.16
      leaf.add(blade)

      const veinMaterial = new THREE.LineBasicMaterial({ color: '#d5e6c5', transparent: true, opacity: 0.76 })
      const veinPoints = [new THREE.Vector3(0, -0.91, 0.12), new THREE.Vector3(0, 0.88, 0.12)]
      leaf.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(veinPoints), veinMaterial))
      for (const [y, direction] of [[-0.48, -1], [-0.16, 1], [0.17, -1], [0.48, 1]] as const) {
        const branch = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, y, 0.12), new THREE.Vector3(direction * 0.28, y + 0.2, 0.12), new THREE.Vector3(direction * 0.51, y + 0.34, 0.12))
        leaf.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(branch.getPoints(8)), veinMaterial))
      }
      scene.add(leaf)
      scene.add(new THREE.AmbientLight(0xe0f1dd, 2.3))
      const keyLight = new THREE.DirectionalLight(0xfff5dc, 3.8)
      keyLight.position.set(-2, 3, 4)
      scene.add(keyLight)
      const rimLight = new THREE.DirectionalLight(0x7cae82, 2.2)
      rimLight.position.set(2, -2, -2)
      scene.add(rimLight)
      leaf.rotation.z = -0.34

      if (prefersReducedMotion) render()
      else {
        window.addEventListener('pointermove', onPointerMove, { passive: true })
        renderer.setAnimationLoop(render)
      }
    }

    observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        mountScene()
        observer?.disconnect()
      }
    }, { rootMargin: '120px' })
    observer.observe(host)

    return () => {
      disposed = true
      observer?.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      renderer?.setAnimationLoop(null)
      scene?.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((item) => item.dispose())
        }
      })
      renderer?.dispose()
      renderer?.domElement.remove()
    }
  }, [prefersReducedMotion])

  return <div ref={hostRef} className="pointer-events-none absolute -right-1 top-0 z-10 hidden size-[112px] drop-shadow-[0_16px_22px_rgba(38,80,50,.24)] sm:block" aria-hidden="true">{!webglActive && <motion.span animate={prefersReducedMotion ? undefined : { y: [0, -5, 0], rotate: [0, 3, 0] }} transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }} className="absolute left-[27px] top-[17px] h-[72px] w-[56px] rotate-[35deg] rounded-tl-[95%] rounded-tr-[10%] rounded-br-[95%] rounded-bl-[10%] bg-gradient-to-br from-[#b7cfae] via-[#80a97e] to-[#4b7955] shadow-[inset_-8px_-6px_16px_rgba(22,76,59,.24),0_15px_22px_rgba(22,76,59,.2)]"><span className="absolute left-[28px] top-[8px] h-[55px] w-px rotate-[28deg] bg-white/60" /></motion.span>}</div>
}
