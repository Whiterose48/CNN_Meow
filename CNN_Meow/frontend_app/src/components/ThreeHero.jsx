import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeHero() {
    const canvasRef = useRef()

    useEffect(() => {
        const C = canvasRef.current
        if (!C) return
        const scene = new THREE.Scene()
        const cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 500)
        cam.position.set(0, 0, 40)
        const R = new THREE.WebGLRenderer({ canvas: C, alpha: true, antialias: true })
        R.setSize(innerWidth, innerHeight)
        R.setPixelRatio(Math.min(devicePixelRatio, 2))

        // Soft Sage/Warm palette
        const palette = [0x6B8F71, 0xA8C5AD, 0x4A6B4F, 0xE8975F, 0xF4C089, 0xFDDCB5]

        // Floating soft spheres (organic blobs)
        const blobs = []
        for (let i = 0; i < 8; i++) {
            const r = 1 + Math.random() * 2.5
            const geo = new THREE.SphereGeometry(r, 32, 32)
            const mat = new THREE.MeshBasicMaterial({
                color: palette[i % palette.length],
                transparent: true,
                opacity: 0.04 + Math.random() * 0.03,
            })
            const m = new THREE.Mesh(geo, mat)
            m.position.set((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 35, -10 + Math.random() * -20)
            m.userData = {
                baseY: m.position.y,
                baseX: m.position.x,
                floatSpeed: 0.2 + Math.random() * 0.3,
                floatAmp: 1 + Math.random() * 2,
                driftSpeed: (Math.random() - 0.5) * 0.2,
                offset: Math.random() * Math.PI * 2,
            }
            scene.add(m)
            blobs.push(m)
        }

        // Wireframe torus rings (subtle)
        const rings = []
        for (let i = 0; i < 4; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: palette[i % palette.length],
                wireframe: true,
                transparent: true,
                opacity: 0.035,
            })
            const geo = new THREE.TorusGeometry(2 + Math.random() * 3, 0.3 + Math.random() * 0.5, 8, 24)
            const m = new THREE.Mesh(geo, mat)
            m.position.set((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 30, -15 + Math.random() * -15)
            m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
            m.userData = { rx: (Math.random() - 0.5) * 0.003, ry: (Math.random() - 0.5) * 0.003 }
            scene.add(m)
            rings.push(m)
        }

        // Particles
        const N = 120
        const pGeo = new THREE.BufferGeometry()
        const pos = new Float32Array(N * 3)
        const col = new Float32Array(N * 3)
        const sz = new Float32Array(N)
        const pColors = [new THREE.Color('#6B8F71'), new THREE.Color('#A8C5AD'), new THREE.Color('#E8975F'), new THREE.Color('#F4C089')]
        for (let i = 0; i < N; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 80
            pos[i * 3 + 1] = (Math.random() - 0.5) * 50
            pos[i * 3 + 2] = (Math.random() - 0.5) * 40 - 10
            const c = pColors[~~(Math.random() * pColors.length)]
            col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
            sz[i] = Math.random() * 2 + 0.5
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
        pGeo.setAttribute('color', new THREE.BufferAttribute(col, 3))
        pGeo.setAttribute('size', new THREE.BufferAttribute(sz, 1))
        const pMat = new THREE.ShaderMaterial({
            vertexShader: `attribute float size;varying vec3 vC;void main(){vC=color;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=size*(160.0/-mv.z);gl_Position=projectionMatrix*mv;}`,
            fragmentShader: `varying vec3 vC;void main(){float d=length(gl_PointCoord-vec2(0.5));if(d>0.5)discard;float a=1.0-smoothstep(0.0,0.5,d);gl_FragColor=vec4(vC,a*0.12);}`,
            transparent: true,
            vertexColors: true,
            depthWrite: false,
        })
        scene.add(new THREE.Points(pGeo, pMat))

        let mx = 0, my = 0
        const onMouse = (e) => {
            mx = (e.clientX / innerWidth - 0.5) * 2
            my = (e.clientY / innerHeight - 0.5) * 2
        }
        document.addEventListener('mousemove', onMouse)

        let raf
        const loop = () => {
            raf = requestAnimationFrame(loop)
            const t = Date.now() * 0.001
            blobs.forEach((b) => {
                b.position.y = b.userData.baseY + Math.sin(t * b.userData.floatSpeed + b.userData.offset) * b.userData.floatAmp
                b.position.x = b.userData.baseX + Math.sin(t * b.userData.driftSpeed + b.userData.offset) * 1.5
            })
            rings.forEach((r) => { r.rotation.x += r.userData.rx; r.rotation.y += r.userData.ry })
            const p = pGeo.attributes.position.array
            for (let i = 0; i < N; i++) {
                p[i * 3 + 1] += Math.sin(t * 0.4 + i * 0.3) * 0.003
                p[i * 3] += Math.cos(t * 0.3 + i * 0.4) * 0.002
            }
            pGeo.attributes.position.needsUpdate = true
            cam.position.x += (mx * 2.5 - cam.position.x) * 0.015
            cam.position.y += (-my * 1.2 - cam.position.y) * 0.015
            cam.lookAt(0, 0, 0)
            R.render(scene, cam)
        }
        loop()

        const onResize = () => {
            cam.aspect = innerWidth / innerHeight
            cam.updateProjectionMatrix()
            R.setSize(innerWidth, innerHeight)
        }
        addEventListener('resize', onResize)

        return () => {
            cancelAnimationFrame(raf)
            document.removeEventListener('mousemove', onMouse)
            removeEventListener('resize', onResize)
            R.dispose()
        }
    }, [])

    return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} />
}
