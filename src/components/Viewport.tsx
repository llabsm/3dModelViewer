import { useRef, useEffect, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../stores/useAppStore.ts';

function DynamicModel({ code }: { code: string }) {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;

    // Clear existing children
    while (groupRef.current.children.length > 0) {
      const child = groupRef.current.children[0];
      groupRef.current.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    }

    try {
      // Execute the Three.js code with the group as the scene
      const fn = new Function('THREE', 'scene', code);
      fn(THREE, groupRef.current);
    } catch (err) {
      console.error('Error executing model code:', err);
    }
  }, [code]);

  return <group ref={groupRef} />;
}

function SceneContent() {
  const { viewMode, showGrid, showAxes, autoRotate, modelCode } = useAppStore();
  const controlsRef = useRef<any>(null);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      <pointLight position={[0, 10, 0]} intensity={0.5} />

      {showGrid && (
        <Grid
          args={[20, 20]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#30363d"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#484f58"
          fadeDistance={30}
          fadeStrength={1}
          infiniteGrid
          position={[0, -0.01, 0]}
        />
      )}

      {showAxes && <axesHelper args={[5]} />}

      {modelCode && (
        <ModelWrapper code={modelCode} viewMode={viewMode} />
      )}

      {!modelCode && <PlaceholderScene />}

      <OrbitControls
        ref={controlsRef}
        autoRotate={autoRotate}
        autoRotateSpeed={2}
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={50}
      />

      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport labelColor="white" axisHeadScale={1} />
      </GizmoHelper>

      <Environment preset="city" />
    </>
  );
}

function ModelWrapper({ code, viewMode }: { code: string; viewMode: string }) {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;

    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (viewMode === 'wireframe') {
          child.material = new THREE.MeshBasicMaterial({
            color: (child.material as THREE.MeshStandardMaterial)?.color || new THREE.Color(0x58a6ff),
            wireframe: true,
          });
        } else if (viewMode === 'points') {
          // Points mode: render as points
          child.material = new THREE.PointsMaterial({
            color: (child.material as THREE.MeshStandardMaterial)?.color || new THREE.Color(0x58a6ff),
            size: 0.05,
          });
        }
      }
    });
  }, [viewMode, code]);

  return (
    <group ref={groupRef}>
      <DynamicModel code={code} />
    </group>
  );
}

function PlaceholderScene() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0.5, 0]}>
      <torusKnotGeometry args={[1, 0.3, 128, 32]} />
      <meshStandardMaterial color="#58a6ff" roughness={0.3} metalness={0.7} />
    </mesh>
  );
}

export function Viewport() {
  const sceneRef = useRef<THREE.Scene | null>(null);

  return (
    <div className="flex-1 relative">
      <Canvas
        camera={{ position: [5, 5, 5], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        onCreated={({ scene }) => {
          sceneRef.current = scene;
          scene.background = new THREE.Color('#1a1a2e');
        }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>

      {/* Scene ref for export */}
      <SceneRefExporter sceneRef={sceneRef} />
    </div>
  );
}

function SceneRefExporter({ sceneRef }: { sceneRef: React.MutableRefObject<THREE.Scene | null> }) {
  const { scene } = useThree();

  useEffect(() => {
    sceneRef.current = scene;
  }, [scene, sceneRef]);

  return null;
}

// We need this wrapped in Canvas context
export function ViewportWithRef({ sceneRef }: { sceneRef: React.MutableRefObject<THREE.Scene | null> }) {
  return (
    <div className="flex-1 relative">
      <Canvas
        camera={{ position: [5, 5, 5], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        onCreated={({ scene }) => {
          sceneRef.current = scene;
          scene.background = new THREE.Color('#1a1a2e');
        }}
      >
        <Suspense fallback={null}>
          <SceneContent />
          <SceneRefExporter sceneRef={sceneRef} />
        </Suspense>
      </Canvas>
    </div>
  );
}
