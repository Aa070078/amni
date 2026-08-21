"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import type * as THREE from "three";

const INDIGO = "#f2f1ff";
const LIGHT_INDIGO = "#a5a3f8";

function FloatingShapes({ animate }: { animate: boolean }) {
  const group = useRef<THREE.Group>(null);
  const torus = useRef<THREE.Mesh>(null);
  const bars = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!animate) return;
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y = Math.sin(t * 0.12) * 0.24 + state.pointer.x * 0.22;
      group.current.rotation.x = Math.cos(t * 0.1) * 0.1 - state.pointer.y * 0.16;
    }
    if (torus.current) {
      torus.current.rotation.x = Math.PI / 2 + t * 0.12;
      torus.current.rotation.z = t * 0.18;
      torus.current.position.y = Math.sin(t * 0.6) * 0.14;
    }
    if (bars.current) {
      bars.current.position.y = Math.cos(t * 0.5) * 0.08;
      bars.current.rotation.y = Math.sin(t * 0.2) * 0.16;
    }
  });

  return (
    <group ref={group}>
      <mesh ref={torus} position={[0.15, 0, -0.45]}>
        <torusGeometry args={[1.24, 0.035, 12, 64]} />
        <meshStandardMaterial color={LIGHT_INDIGO} roughness={0.35} metalness={0.5} transparent opacity={0.86} />
      </mesh>
      <group ref={bars} position={[0.15, -0.55, 0]}>
        <mesh position={[-0.72, 0.28, 0]}>
          <boxGeometry args={[0.34, 0.56, 0.34]} />
          <meshStandardMaterial color={LIGHT_INDIGO} roughness={0.28} metalness={0.42} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[0.34, 1.1, 0.34]} />
          <meshStandardMaterial color={INDIGO} roughness={0.25} metalness={0.54} />
        </mesh>
        <mesh position={[0.72, 0.82, 0]}>
          <boxGeometry args={[0.34, 1.64, 0.34]} />
          <meshStandardMaterial color={LIGHT_INDIGO} roughness={0.28} metalness={0.42} />
        </mesh>
      </group>
    </group>
  );
}

export function Hero3D() {
  const reducedMotion = useReducedMotion();
  return (
    <div className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing" aria-hidden="true">
      <Canvas
        frameloop={reducedMotion ? "never" : "always"}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 5], fov: 42 }}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      >
        <ambientLight intensity={1.1} />
        <directionalLight position={[3, 4, 5]} intensity={1.6} />
        <Suspense fallback={null}>
          <FloatingShapes animate={!reducedMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}
