"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import type * as THREE from "three";

const INDIGO = "#6b63f1";
const LIGHT_INDIGO = "#a5a3f8";

function FloatingShapes() {
  const group = useRef<THREE.Group>(null);
  const icosa = useRef<THREE.Mesh>(null);
  const torus = useRef<THREE.Mesh>(null);
  const octa = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y = Math.sin(t * 0.12) * 0.35;
      group.current.rotation.x = Math.cos(t * 0.1) * 0.14;
    }
    if (icosa.current) icosa.current.rotation.y = t * 0.22;
    if (torus.current) {
      torus.current.rotation.x = t * 0.3;
      torus.current.rotation.z = t * 0.18;
      torus.current.position.y = Math.sin(t * 0.6) * 0.14;
    }
    if (octa.current) {
      octa.current.rotation.z = t * 0.2;
      octa.current.position.y = Math.cos(t * 0.5) * 0.12;
    }
  });

  return (
    <group ref={group}>
      <mesh ref={icosa} position={[1.35, 0.3, 0]}>
        <icosahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial color={INDIGO} wireframe roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh ref={torus} position={[-1.35, -0.15, -0.4]}>
        <torusGeometry args={[0.55, 0.18, 12, 42]} />
        <meshStandardMaterial color={INDIGO} roughness={0.35} metalness={0.25} transparent opacity={0.85} />
      </mesh>
      <mesh ref={octa} position={[0.25, 0.85, -0.7]}>
        <octahedronGeometry args={[0.34, 0]} />
        <meshStandardMaterial color={LIGHT_INDIGO} roughness={0.4} metalness={0.3} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

export function Hero3D() {
  const reducedMotion = useReducedMotion();
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <Canvas
        frameloop={reducedMotion ? "never" : "always"}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 5], fov: 42 }}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      >
        <ambientLight intensity={1.1} />
        <directionalLight position={[3, 4, 5]} intensity={1.6} />
        <Suspense fallback={null}>
          <FloatingShapes />
        </Suspense>
      </Canvas>
    </div>
  );
}
