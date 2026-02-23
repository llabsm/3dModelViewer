import { useRef, useEffect, useCallback, Suspense, useState } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport, Grid, Environment, TransformControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../stores/useAppStore.ts';

// Builds meshes from code and returns them — the core model rendering
function DynamicModel({ code, viewMode, modelVersion }: { code: string; viewMode: string; modelVersion: number }) {
  const groupRef = useRef<THREE.Group>(null);
  // Store original materials so we can restore them when switching back to solid
  const originalMaterials = useRef<Map<number, THREE.Material | THREE.Material[]>>(new Map());

  useEffect(() => {
    if (!groupRef.current) return;

    // Clear existing children and material cache
    originalMaterials.current.clear();
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
      const fn = new Function('THREE', 'scene', code);
      fn(THREE, groupRef.current);

      // Cache original materials for every mesh
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          originalMaterials.current.set(child.id, child.material);
        }
      });
    } catch (err) {
      console.error('Error executing model code:', err);
    }
  }, [code, modelVersion]);

  // Apply view mode as a separate effect — runs AFTER model is built
  useEffect(() => {
    if (!groupRef.current) return;

    // Small delay to ensure DynamicModel meshes are populated
    const timer = setTimeout(() => {
      groupRef.current!.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const origMat = originalMaterials.current.get(child.id);
          const origColor = origMat instanceof THREE.MeshStandardMaterial
            ? origMat.color.clone()
            : new THREE.Color(0x58a6ff);

          if (viewMode === 'wireframe') {
            child.material = new THREE.MeshBasicMaterial({
              color: origColor,
              wireframe: true,
            });
          } else if (viewMode === 'points') {
            child.material = new THREE.MeshBasicMaterial({
              color: origColor,
              wireframe: true,
              wireframeLinewidth: 0.5,
              opacity: 0.3,
              transparent: true,
            });
          } else {
            // Restore original material
            if (origMat) {
              child.material = origMat;
            }
          }
        }
      });
    }, 10);

    return () => clearTimeout(timer);
  }, [viewMode, code, modelVersion]);

  return <group ref={groupRef} />;
}

// Ruler labels along the grid
function RulerMarks() {
  const marks = [];
  for (let i = -10; i <= 10; i += 2) {
    if (i === 0) continue;
    // X axis marks
    marks.push(
      <Html key={`x${i}`} position={[i, 0, 0]} center style={{ pointerEvents: 'none' }}>
        <span style={{ color: '#f85149', fontSize: '10px', fontFamily: 'monospace', opacity: 0.7 }}>{i}</span>
      </Html>
    );
    // Z axis marks
    marks.push(
      <Html key={`z${i}`} position={[0, 0, i]} center style={{ pointerEvents: 'none' }}>
        <span style={{ color: '#58a6ff', fontSize: '10px', fontFamily: 'monospace', opacity: 0.7 }}>{i}</span>
      </Html>
    );
  }
  // Y axis marks
  for (let i = 2; i <= 10; i += 2) {
    marks.push(
      <Html key={`y${i}`} position={[0, i, 0]} center style={{ pointerEvents: 'none' }}>
        <span style={{ color: '#3fb950', fontSize: '10px', fontFamily: 'monospace', opacity: 0.7 }}>{i}</span>
      </Html>
    );
  }

  // Axis labels
  marks.push(
    <Html key="xl" position={[11, 0, 0]} center style={{ pointerEvents: 'none' }}>
      <span style={{ color: '#f85149', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}>X</span>
    </Html>,
    <Html key="yl" position={[0, 11, 0]} center style={{ pointerEvents: 'none' }}>
      <span style={{ color: '#3fb950', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}>Y</span>
    </Html>,
    <Html key="zl" position={[0, 0, 11]} center style={{ pointerEvents: 'none' }}>
      <span style={{ color: '#58a6ff', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}>Z</span>
    </Html>,
  );

  // Ruler lines (thicker axis lines)
  const xLine = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-10, 0, 0), new THREE.Vector3(10, 0, 0)]);
  const yLine = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 10, 0)]);
  const zLine = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -10), new THREE.Vector3(0, 0, 10)]);

  // Tick marks
  const ticks: React.ReactElement[] = [];
  for (let i = -10; i <= 10; i++) {
    if (i === 0) continue;
    const tickGeoX = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(i, 0, -0.1), new THREE.Vector3(i, 0, 0.1)
    ]);
    ticks.push(
      <lineSegments key={`tx${i}`} geometry={tickGeoX}>
        <lineBasicMaterial color="#f85149" opacity={0.4} transparent />
      </lineSegments>
    );
    const tickGeoZ = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.1, 0, i), new THREE.Vector3(0.1, 0, i)
    ]);
    ticks.push(
      <lineSegments key={`tz${i}`} geometry={tickGeoZ}>
        <lineBasicMaterial color="#58a6ff" opacity={0.4} transparent />
      </lineSegments>
    );
  }

  return (
    <group>
      <lineSegments geometry={xLine}>
        <lineBasicMaterial color="#f85149" opacity={0.6} transparent />
      </lineSegments>
      <lineSegments geometry={yLine}>
        <lineBasicMaterial color="#3fb950" opacity={0.6} transparent />
      </lineSegments>
      <lineSegments geometry={zLine}>
        <lineBasicMaterial color="#58a6ff" opacity={0.6} transparent />
      </lineSegments>
      {ticks}
      {marks}
    </group>
  );
}

// Selectable wrapper — clicks on meshes select them for transform
function SelectableModel({ code, viewMode, modelVersion, editorMode }: {
  code: string; viewMode: string; modelVersion: number; editorMode: string;
}) {
  const { selectedObjectId, setSelectedObjectId } = useAppStore();
  const groupRef = useRef<THREE.Group>(null);
  const [selectedObj, setSelectedObj] = useState<THREE.Object3D | null>(null);
  const controlsRef = useRef<any>(null);

  // Find object by uuid when selectedObjectId changes
  useEffect(() => {
    if (!groupRef.current || !selectedObjectId) {
      setSelectedObj(null);
      return;
    }
    let found: THREE.Object3D | null = null;
    groupRef.current.traverse((child) => {
      if (child.uuid === selectedObjectId) {
        found = child;
      }
    });
    setSelectedObj(found);
  }, [selectedObjectId, modelVersion, code]);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    if (editorMode === 'view') return;
    e.stopPropagation();
    const obj = e.object;
    if (obj instanceof THREE.Mesh) {
      setSelectedObjectId(obj.uuid);
    }
  }, [editorMode, setSelectedObjectId]);

  const handleMissClick = useCallback(() => {
    if (editorMode !== 'view') {
      setSelectedObjectId(null);
    }
  }, [editorMode, setSelectedObjectId]);

  const transformMode = editorMode === 'move' ? 'translate'
    : editorMode === 'rotate' ? 'rotate'
    : editorMode === 'scale' ? 'scale'
    : undefined;

  return (
    <>
      <group ref={groupRef} onClick={handleClick} onPointerMissed={handleMissClick}>
        <DynamicModel code={code} viewMode={viewMode} modelVersion={modelVersion} />
      </group>
      {selectedObj && transformMode && (
        <TransformControls
          ref={controlsRef}
          object={selectedObj}
          mode={transformMode}
          size={0.75}
        />
      )}
    </>
  );
}

function PlaceholderScene() {
  return (
    <group>
      <mesh position={[0, 0.75, 0]}>
        <torusKnotGeometry args={[0.8, 0.25, 128, 32]} />
        <meshStandardMaterial color="#30363d" roughness={0.5} metalness={0.3} />
      </mesh>
      <Html position={[0, -0.5, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          textAlign: 'center',
          color: '#8b949e',
          fontSize: '14px',
          fontFamily: '-apple-system, sans-serif',
          whiteSpace: 'nowrap',
        }}>
          Describe your model in the chat to get started
        </div>
      </Html>
    </group>
  );
}

function SceneContent() {
  const { viewMode, showGrid, showAxes, showRuler, modelCode, modelVersion, editorMode } = useAppStore();

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      <pointLight position={[0, 10, 0]} intensity={0.3} />

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

      {showAxes && <axesHelper args={[10]} />}
      {showRuler && <RulerMarks />}

      {modelCode ? (
        <SelectableModel
          code={modelCode}
          viewMode={viewMode}
          modelVersion={modelVersion}
          editorMode={editorMode}
        />
      ) : (
        <PlaceholderScene />
      )}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={0.5}
        maxDistance={100}
        makeDefault
      />

      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport labelColor="white" axisHeadScale={1} />
      </GizmoHelper>

      <Environment preset="city" />
    </>
  );
}

function SceneRefSync({ sceneRef }: { sceneRef: React.MutableRefObject<THREE.Scene | null> }) {
  const { scene } = useThree();
  useEffect(() => {
    sceneRef.current = scene;
  }, [scene, sceneRef]);
  return null;
}

export function ViewportWithRef({ sceneRef }: { sceneRef: React.MutableRefObject<THREE.Scene | null> }) {
  return (
    <div className="flex-1 relative">
      <Canvas
        camera={{ position: [6, 4, 6], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        onCreated={({ scene }) => {
          sceneRef.current = scene;
          scene.background = new THREE.Color('#1a1a2e');
        }}
      >
        <Suspense fallback={null}>
          <SceneContent />
          <SceneRefSync sceneRef={sceneRef} />
        </Suspense>
      </Canvas>

      {/* Editor mode hint */}
      <EditorModeHint />
    </div>
  );
}

function EditorModeHint() {
  const { editorMode, selectedObjectId } = useAppStore();
  if (editorMode === 'view') return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#161b22]/90 border border-[#30363d] rounded-lg px-4 py-2 text-xs text-[#8b949e] backdrop-blur-sm">
      {selectedObjectId
        ? `${editorMode.charAt(0).toUpperCase() + editorMode.slice(1)} mode — drag gizmo to transform`
        : `${editorMode.charAt(0).toUpperCase() + editorMode.slice(1)} mode — click an object to select it`
      }
    </div>
  );
}
