import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const mat = {
  stainless: { color: '#aebbc0', metalness: 0.88, roughness: 0.24, envMapIntensity: 1.35 },
  brushed: { color: '#7f929a', metalness: 0.86, roughness: 0.34, envMapIntensity: 1.2 },
  darkMetal: { color: '#34464e', metalness: 0.78, roughness: 0.36, envMapIntensity: 1.0 },
  blue: { color: '#164d75', metalness: 0.72, roughness: 0.29, clearcoat: 0.42, clearcoatRoughness: 0.24, envMapIntensity: 1.25 },
  blueEdge: { color: '#286d96', metalness: 0.68, roughness: 0.26, clearcoat: 0.38, envMapIntensity: 1.25 },
};

const SUCTION_PIPE_A = [[-3.2, 0.63, 0], [-2.75, 0.63, 0], [-2.25, 0.63, 0]];
const SUCTION_PIPE_B = [[-2.25, 0.63, 0], [-1.9, 0.67, 0], [-1.55, 0.78, 0], [-1.15, 0.93, 0], [-0.87, 0.95, 0]];
const DISCHARGE_PIPE = [[-0.55, 1.95, 0], [-0.55, 2.35, 0], [-0.32, 2.68, 0], [2.8, 2.68, 0], [3.2, 2.4, 0], [3.2, 1.8, 0]];
const SUCTION_PIPE_MATERIAL = { ...mat.stainless, color: '#9eafb4', roughness: 0.19 };

function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    const previous = scene.environment;
    scene.environment = target.texture;
    return () => {
      scene.environment = previous;
      target.dispose();
      room.dispose?.();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

function Tube({ points, radius = 0.09, material = mat.stainless, onClick, selected = false }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
    return new THREE.TubeGeometry(curve, 72, radius, 20, false);
  }, [points, radius]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow onClick={(event) => { event.stopPropagation(); onClick?.(); }}>
      <meshPhysicalMaterial {...material} color={selected ? '#3a9e7b' : material.color} />
    </mesh>
  );
}

function BoltRing({ radius = 0.2, count = 8, depth = 0.025, color = '#d7dfe1' }) {
  return <>{Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return (
      <mesh key={index} position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, depth, 6]} />
        <meshPhysicalMaterial color={color} metalness={0.94} roughness={0.2} />
      </mesh>
    );
  })}</>;
}

function Flange({ position, axis = 'x', radius = 0.17, selected = false }) {
  const rotation = axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, 0.09, 48]} />
        <meshPhysicalMaterial {...mat.stainless} color={selected ? '#56b997' : '#c2cdd0'} />
      </mesh>
      <mesh position={[0, 0.051, 0]}>
        <torusGeometry args={[radius * 0.79, 0.018, 10, 48]} />
        <meshPhysicalMaterial color="#53656d" metalness={0.92} roughness={0.26} />
      </mesh>
      <BoltRing radius={radius * 0.78} count={8}/>
    </group>
  );
}

function Gauge({ position, value = 4.8, label = 'bar', onClick, warning = false, offline = false }) {
  const needle = useMemo(() => THREE.MathUtils.clamp((value / 10) * Math.PI * 1.5 - Math.PI * 0.75, -Math.PI * 0.75, Math.PI * 0.75), [value]);
  return (
    <group position={position} onClick={(event) => { event.stopPropagation(); onClick?.(); }}>
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.07, 0.22, 24]} />
        <meshPhysicalMaterial {...mat.stainless}/>
      </mesh>
      <mesh position={[0, 0.31, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.19, 0.085, 48]} />
        <meshPhysicalMaterial color="#aeb9bd" metalness={0.84} roughness={0.24}/>
      </mesh>
      <group position={[0, 0.31, 0.047]}>
        <mesh position={[0, 0, 0]}>
          <circleGeometry args={[0.157, 48]} />
          <meshBasicMaterial color={offline ? '#e8dfca' : '#eef2ee'} side={THREE.DoubleSide}/>
        </mesh>
        {Array.from({ length: 11 }, (_, index) => {
          const angle = -Math.PI * 0.75 + (index / 10) * Math.PI * 1.5;
          return <mesh key={index} position={[Math.sin(angle) * 0.125, Math.cos(angle) * 0.125, 0.004]} rotation={[0, 0, -angle]}>
            <boxGeometry args={[0.006, index % 5 === 0 ? 0.025 : 0.014, 0.002]}/>
            <meshBasicMaterial color="#33434a"/>
          </mesh>;
        })}
        <mesh position={[0, 0, 0.009]} rotation={[0, 0, -needle]}>
          <boxGeometry args={[0.009, 0.112, 0.004]}/>
          <meshBasicMaterial color={warning ? '#c95d48' : '#9c4d3e'}/>
        </mesh>
        <mesh position={[0, 0, 0.014]}>
          <circleGeometry args={[0.014, 20]}/>
          <meshBasicMaterial color="#27363d"/>
        </mesh>
        <mesh position={[0, -0.095, 0.003]}>
          <planeGeometry args={[0.105, 0.035]}/>
          <meshBasicMaterial color="#33434a"/>
        </mesh>
      </group>
      <mesh position={[0, 0.31, 0.095]}>
        <cylinderGeometry args={[0.178, 0.178, 0.012, 48]}/>
        <meshPhysicalMaterial color="#d9e4e5" transparent opacity={0.18} roughness={0.08} metalness={0.05} depthWrite={false}/>
      </mesh>
      <mesh position={[0, 0.31, 0.11]}>
        <sphereGeometry args={[0.009, 12, 12]}/>
        <meshPhysicalMaterial color="#293b43" metalness={0.8}/>
      </mesh>
      <group position={[0, 0.31, 0.12]}>
        <mesh position={[0, -0.145, 0]}>
          <planeGeometry args={[0.13, 0.035]}/>
          <meshBasicMaterial transparent opacity={0}/>
        </mesh>
      </group>
      <mesh position={[0.125, 0.435, 0.105]}>
        <sphereGeometry args={[0.018, 12, 12]}/>
        <meshBasicMaterial color={offline ? '#d88b38' : '#46bd8d'} toneMapped={false}/>
      </mesh>
    </group>
  );
}

function LevelRadar({ onClick, level }) {
  return (
    <group position={[-4.25, 3.76, 0]} onClick={(event) => { event.stopPropagation(); onClick?.(); }}>
      <mesh castShadow>
        <cylinderGeometry args={[0.16, 0.21, 0.2, 40]}/>
        <meshPhysicalMaterial {...mat.stainless}/>
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.06, 32]}/>
        <meshPhysicalMaterial color="#253740" metalness={0.45} roughness={0.24}/>
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.025, 16, 16]}/>
        <meshBasicMaterial color={level < 25 ? '#e7a347' : '#44c997'}/>
      </mesh>
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.12, 24]}/>
        <meshPhysicalMaterial color="#53656d" metalness={0.88} roughness={0.24}/>
      </mesh>
    </group>
  );
}

function Tank({ level, selected, onSelect }) {
  const height = 3.12;
  const windowHeight = 2.42;
  const waterHeight = Math.max(0.025, windowHeight * level / 100);
  return (
    <group>
      {/* Vessel shell and formed heads */}
      <group position={[-4.25, 1.87, 0]} onClick={(event) => { event.stopPropagation(); onSelect('tank'); }}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[1.08, 1.08, height, 96, 1, true]}/>
          <meshPhysicalMaterial {...mat.stainless} color={selected ? '#83b8a7' : '#a9b6bb'} side={THREE.DoubleSide}/>
        </mesh>
        <mesh position={[0, 1.57, 0]} scale={[1.08, 0.24, 1.08]} castShadow>
          <sphereGeometry args={[1, 64, 32]}/>
          <meshPhysicalMaterial {...mat.stainless} color="#bbc5c8"/>
        </mesh>
        <mesh position={[0, -1.56, 0]} scale={[1.08, 0.22, 1.08]} castShadow>
          <sphereGeometry args={[1, 64, 32]}/>
          <meshPhysicalMaterial {...mat.brushed} color="#84969d"/>
        </mesh>
        {[ -1.35, -0.68, 0, 0.68, 1.35 ].map((y, i) => <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.083, i === 2 ? 0.034 : 0.024, 12, 96]}/>
          <meshPhysicalMaterial {...mat.stainless} color="#7e9097"/>
        </mesh>)}
        {/* Top manway and vent */}
        <mesh position={[0, 1.82, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.28, 0.12, 48]}/>
          <meshPhysicalMaterial {...mat.brushed}/>
        </mesh>
        <mesh position={[0, 1.91, 0]}>
          <cylinderGeometry args={[0.23, 0.23, 0.045, 48]}/>
          <meshPhysicalMaterial {...mat.stainless}/>
        </mesh>
        <group position={[0, -0.06, 1.075]}>
          {/* Large inspection window, with water volume behind it */}
          <mesh position={[0, 0, -0.018]}>
            <boxGeometry args={[0.82, 2.42, 0.055]}/>
            <meshPhysicalMaterial color="#b9d9e0" metalness={0.08} roughness={0.1} transmission={0.48} thickness={0.22} transparent opacity={0.35} depthWrite={false}/>
          </mesh>
          <mesh position={[0, -1.21 + waterHeight / 2, -0.075]} scale={[1, waterHeight, 1]}>
            <boxGeometry args={[0.72, 1, 0.075]}/>
            <meshPhysicalMaterial color="#1686aa" metalness={0.08} roughness={0.13} transmission={0.2} thickness={0.35} transparent opacity={0.84} depthWrite={false}/>
          </mesh>
          <mesh position={[0, -1.21 + waterHeight, -0.025]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.71, 0.07]}/>
            <meshPhysicalMaterial color="#8ee1ed" emissive="#17647f" emissiveIntensity={0.17} roughness={0.1} metalness={0.02} transparent opacity={0.72} side={THREE.DoubleSide}/>
          </mesh>
          <mesh position={[-0.43, 0, 0.018]}>
            <boxGeometry args={[0.055, 2.53, 0.09]}/>
            <meshPhysicalMaterial {...mat.stainless}/>
          </mesh>
          <mesh position={[0.43, 0, 0.018]}>
            <boxGeometry args={[0.055, 2.53, 0.09]}/>
            <meshPhysicalMaterial {...mat.stainless}/>
          </mesh>
          {[-1.23, 1.23].map((y) => <mesh key={y} position={[0, y, 0.018]}>
            <boxGeometry args={[0.91, 0.055, 0.09]}/>
            <meshPhysicalMaterial {...mat.stainless}/>
          </mesh>)}
          {Array.from({ length: 5 }, (_, i) => <mesh key={i} position={[0.475, -1.06 + i * 0.53, 0.055]}>
            <sphereGeometry args={[0.022, 12, 12]}/>
            <meshPhysicalMaterial {...mat.stainless}/>
          </mesh>)}
        </group>
      </group>
      {/* Structural legs and cross bracing */}
      {[-0.72, 0.72].flatMap((x) => [-0.72, 0.72].map((z) => (
        <group key={`${x}-${z}`} position={[-4.25 + x, 0, z]}>
          <mesh position={[0, 0.42, 0]} castShadow>
            <boxGeometry args={[0.15, 0.84, 0.15]}/>
            <meshPhysicalMaterial {...mat.darkMetal}/>
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.32, 0.07, 0.32]}/>
            <meshPhysicalMaterial {...mat.stainless}/>
          </mesh>
          <mesh position={[0, 0.035, 0]}>
            <boxGeometry args={[0.45, 0.05, 0.4]}/>
            <meshPhysicalMaterial {...mat.darkMetal}/>
          </mesh>
        </group>
      )))}
      <LevelRadar level={level} onClick={() => onSelect('sensor-level')}/>
      {/* External level gauge and isolation valves */}
      <group position={[-2.98, 1.8, 0.92]} onClick={() => onSelect('sensor-level')}>
        <mesh>
          <cylinderGeometry args={[0.055, 0.055, 2.48, 24]}/>
          <meshPhysicalMaterial color="#c6e6e9" transmission={0.5} roughness={0.08} thickness={0.1} transparent opacity={0.36}/>
        </mesh>
        <mesh position={[0, -1.24 + waterHeight / 2, 0]} scale={[1, waterHeight, 1]}>
          <cylinderGeometry args={[0.033, 0.033, 1, 20]}/>
          <meshPhysicalMaterial color="#1686aa" roughness={0.14} transparent opacity={0.82}/>
        </mesh>
        <mesh position={[0, 1.28, 0]}><cylinderGeometry args={[0.085, 0.085, 0.12, 24]}/><meshPhysicalMaterial {...mat.stainless}/></mesh>
        <mesh position={[0, -1.28, 0]}><cylinderGeometry args={[0.085, 0.085, 0.12, 24]}/><meshPhysicalMaterial {...mat.stainless}/></mesh>
      </group>
      {/* Access ladder */}
      {[-5.48, -5.22].map((x) => <mesh key={x} position={[x, 1.78, 0.48]} castShadow>
        <cylinderGeometry args={[0.028, 0.028, 2.8, 16]}/>
        <meshPhysicalMaterial {...mat.stainless}/>
      </mesh>)}
      {Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[-5.35, 0.48 + i * 0.27, 0.48]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 0.28, 12]}/>
        <meshPhysicalMaterial {...mat.stainless}/>
      </mesh>)}
    </group>
  );
}

function Pump({ running, cavitation, cavitationStrength, selected, onSelect }) {
  const impeller = useRef();
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.absarc(0, 0, 0.61, 0, Math.PI * 2, false);
    const inlet = new THREE.Path();
    inlet.absarc(0, 0, 0.31, 0, Math.PI * 2, true);
    s.holes.push(inlet);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.56, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.035, bevelThickness: 0.035, curveSegments: 64 });
    g.computeVertexNormals();
    return g;
  }, []);
  useFrame((_, delta) => {
    if (running && impeller.current) impeller.current.rotation.z += delta * 4.4;
  });
  return (
    <group>
      <group position={[-0.55, 0.95, 0]} onClick={(event) => { event.stopPropagation(); onSelect('pump'); }}>
        <mesh geometry={shape} position={[0, 0, -0.28]} castShadow receiveShadow>
          <meshPhysicalMaterial {...mat.blue} color={selected ? '#3d967e' : '#164d75'}/>
        </mesh>
        <mesh position={[0, 0, 0.305]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.335, 0.035, 14, 64]}/>
          <meshPhysicalMaterial {...mat.stainless}/>
        </mesh>
        <mesh position={[0, 0, 0.34]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.315, 0.315, 0.025, 64]}/>
          <meshPhysicalMaterial color="#a9c9ce" transmission={0.42} thickness={0.12} roughness={0.1} transparent opacity={0.33} depthWrite={false}/>
        </mesh>
        <group ref={impeller} position={[0, 0, 0.29]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.07, 32]}/>
            <meshPhysicalMaterial {...mat.stainless}/>
          </mesh>
          {Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[0, 0, 0]} rotation={[0, 0, (i / 7) * Math.PI * 2]}>
            <boxGeometry args={[0.29, 0.045, 0.035]}/>
            <meshPhysicalMaterial color="#c2cdd0" metalness={0.93} roughness={0.2}/>
          </mesh>)}
        </group>
        {Array.from({ length: 10 }, (_, i) => {
          const a = i * Math.PI * 2 / 10;
          return <mesh key={i} position={[Math.cos(a) * 0.54, Math.sin(a) * 0.54, 0.37]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.045, 8]}/>
            <meshPhysicalMaterial {...mat.stainless}/>
          </mesh>;
        })}
        <mesh position={[-0.05, -0.67, 0]} castShadow>
          <boxGeometry args={[0.72, 0.16, 0.84]}/>
          <meshPhysicalMaterial {...mat.blue}/>
        </mesh>
        <mesh position={[-0.05, -0.78, 0]}>
          <boxGeometry args={[0.9, 0.08, 1.02]}/>
          <meshPhysicalMaterial {...mat.darkMetal}/>
        </mesh>
        <mesh position={[-0.1, 0.05, 0.02]}>
          <torusGeometry args={[0.16, 0.045, 12, 40]}/>
          <meshPhysicalMaterial {...mat.blueEdge}/>
        </mesh>
      </group>
      {/* Pump suction nozzle and top discharge neck */}
      <mesh position={[-1.18, 0.94, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.19, 0.21, 0.5, 48]}/>
        <meshPhysicalMaterial {...mat.blue}/>
      </mesh>
      <mesh position={[-0.55, 1.63, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.2, 0.55, 48]}/>
        <meshPhysicalMaterial {...mat.blue}/>
      </mesh>
      <mesh position={[-0.55, 1.93, 0]} castShadow>
        <cylinderGeometry args={[0.21, 0.21, 0.12, 48]}/>
        <meshPhysicalMaterial {...mat.stainless}/>
      </mesh>
      {/* Subtle vapor bubbles in the inspection section */}
      <Bubbles active={cavitation} strength={cavitationStrength} center={[-0.55, 0.95, 0.42]} count={20} color="#e1f3f5"/>
    </group>
  );
}

function Bubbles({ active, center, count = 12, color = '#d4f0f3', strength = 0.55 }) {
  const refs = useRef([]);
  useFrame(({ clock }) => {
    const intensity = THREE.MathUtils.clamp(strength, 0, 1);
    const visibleCount = Math.max(1, Math.ceil(count * intensity));
    refs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const t = (clock.elapsedTime * (0.18 + intensity * 0.52) + index / count) % 1;
      mesh.position.set(
        center[0] + Math.sin(index * 8 + t * 5) * (0.025 + intensity * 0.08),
        center[1] + t * (0.22 + intensity * 0.48),
        center[2] + Math.cos(index * 4 + t * 4) * (0.018 + intensity * 0.05)
      );
      const scale = 0.45 + intensity * 0.8;
      mesh.scale.setScalar(scale);
      mesh.visible = active && index < visibleCount;
    });
  });
  return <>{Array.from({ length: count }, (_, index) => <mesh key={index} ref={(node) => { refs.current[index] = node; }}>
    <sphereGeometry args={[0.018 + (index % 3) * 0.008, 14, 14]}/>
    <meshPhysicalMaterial color={color} transparent opacity={0.72} roughness={0.06} metalness={0.01} transmission={0.48} thickness={0.12} depthWrite={false}/>
  </mesh>)}</>;
}

function Motor({ running, selected, onSelect }) {
  const fan = useRef();
  useFrame((_, delta) => { if (running && fan.current) fan.current.rotation.x += delta * 7; });
  return (
    <group onClick={(event) => { event.stopPropagation(); onSelect('motor'); }}>
      <mesh position={[1.42, 0.98, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.44, 0.44, 1.66, 72]}/>
        <meshPhysicalMaterial {...mat.blue}/>
      </mesh>
      {/* Cooling fins */}
      {Array.from({ length: 24 }, (_, i) => {
        const angle = i * Math.PI * 2 / 24;
        return <mesh key={i} position={[1.42, 0.98 + Math.cos(angle) * 0.405, Math.sin(angle) * 0.405]} rotation={[Math.sin(angle) * 0.09, 0, Math.PI / 2]} castShadow>
          <boxGeometry args={[1.36, 0.034, 0.06]}/>
          <meshPhysicalMaterial color="#2c6487" metalness={0.76} roughness={0.3}/>
        </mesh>;
      })}
      {[-0.86, 0.86].map((x) => <mesh key={x} position={[1.42 + x, 0.98, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.46, 0.46, 0.11, 64]}/>
        <meshPhysicalMaterial {...mat.stainless}/>
      </mesh>)}
      <mesh position={[2.36, 0.98, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.37, 0.37, 0.22, 48]}/>
        <meshPhysicalMaterial {...mat.darkMetal}/>
      </mesh>
      <group ref={fan} position={[2.49, 0.98, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.27, 0.27, 0.045, 40]}/>
          <meshPhysicalMaterial color="#243a44" metalness={0.75} roughness={0.32}/>
        </mesh>
        {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[0, Math.cos(i * Math.PI * 2 / 9) * 0.17, Math.sin(i * Math.PI * 2 / 9) * 0.17]} rotation={[i * Math.PI * 2 / 9, 0, 0]}>
          <boxGeometry args={[0.035, 0.16, 0.035]}/>
          <meshPhysicalMaterial {...mat.stainless}/>
        </mesh>)}
      </group>
      {/* Terminal box and nameplate */}
      <mesh position={[1.42, 1.53, 0]} castShadow>
        <boxGeometry args={[0.5, 0.34, 0.48]}/>
        <meshPhysicalMaterial {...mat.blueEdge}/>
      </mesh>
      <mesh position={[1.42, 1.72, 0]}>
        <boxGeometry args={[0.39, 0.035, 0.36]}/>
        <meshPhysicalMaterial {...mat.stainless}/>
      </mesh>
      <mesh position={[1.42, 1.53, 0.245]}>
        <boxGeometry args={[0.22, 0.12, 0.012]}/>
        <meshPhysicalMaterial color="#d8e0df" metalness={0.55} roughness={0.32}/>
      </mesh>
      <mesh position={[1.42, 0.36, 0]}>
        <boxGeometry args={[1.76, 0.16, 0.78]}/>
        <meshPhysicalMaterial {...mat.darkMetal}/>
      </mesh>
    </group>
  );
}

function Valve({ position, onClick, selected, open = true }) {
  return (
    <group position={position} onClick={(event) => { event.stopPropagation(); onClick?.(); }}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <sphereGeometry args={[0.22, 40, 28]}/>
        <meshPhysicalMaterial {...mat.blueEdge} color={selected ? '#54b991' : open ? '#315f77' : '#9b713d'}/>
      </mesh>
      <mesh position={[0, 0.27, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.38, 24]}/>
        <meshPhysicalMaterial {...mat.stainless}/>
      </mesh>
      <group position={[0, 0.49, 0]} rotation={[0, 0, open ? 0 : Math.PI / 4]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.19, 0.025, 12, 48]}/>
          <meshPhysicalMaterial {...mat.stainless}/>
        </mesh>
        {Array.from({ length: 4 }, (_, i) => <mesh key={i} rotation={[0, 0, i * Math.PI / 4]}>
          <boxGeometry args={[0.36, 0.025, 0.028]}/>
          <meshPhysicalMaterial {...mat.stainless}/>
        </mesh>)}
      </group>
      <mesh position={[0, -0.2, 0]}>
        <sphereGeometry args={[0.045, 16, 16]}/>
        <meshBasicMaterial color={open ? '#54c99b' : '#d59b50'}/>
      </mesh>
    </group>
  );
}

function FlowParticles({ active, scenario, flow = 32.5 }) {
  const refs = useRef([]);
  const suctionCurve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.12, 0.63, 0), new THREE.Vector3(-2.55, 0.63, 0), new THREE.Vector3(-1.95, 0.65, 0), new THREE.Vector3(-1.35, 0.83, 0), new THREE.Vector3(-0.86, 0.95, 0)
  ]), []);
  const dischargeCurve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.55, 1.92, 0), new THREE.Vector3(-0.55, 2.4, 0), new THREE.Vector3(-0.32, 2.75, 0), new THREE.Vector3(2.9, 2.75, 0), new THREE.Vector3(3.25, 2.4, 0), new THREE.Vector3(3.25, 1.75, 0)
  ]), []);
  useFrame(({ clock }) => {
    const normalizedFlow = THREE.MathUtils.clamp(flow / 32.5, 0, 1.25);
    const visibleCount = Math.ceil(16 * Math.min(1, normalizedFlow));
    refs.current.forEach((node, index) => {
      if (!node) return;
      const onDischarge = index >= 8;
      const curve = onDischarge ? dischargeCurve : suctionCurve;
      const t = (clock.elapsedTime * (0.045 + normalizedFlow * 0.16) + (index % 8) / 8) % 1;
      node.position.copy(curve.getPoint(t));
      node.scale.setScalar(0.65 + normalizedFlow * 0.35);
      node.visible = active && normalizedFlow > 0.015 && index < visibleCount;
    });
  });
  const particleColor = scenario === 'air' ? '#a6e5ed' : scenario === 'cavitation' ? '#d6d9c3' : '#77d8eb';
  return <>{Array.from({ length: 16 }, (_, index) => <mesh key={index} ref={(node) => { refs.current[index] = node; }}>
    <sphereGeometry args={[0.027, 14, 14]}/>
    <meshBasicMaterial color={particleColor} transparent opacity={0.9}/>
  </mesh>)}</>;
}


function IndustrialBackdrop({ theme }) {
  const wallColor = theme === 'dark' ? '#24343d' : '#9caaae';
  return (
    <group>
      <mesh position={[0, 3.2, -3.7]} receiveShadow>
        <boxGeometry args={[15, 6.5, 0.24]}/>
        <meshStandardMaterial color={wallColor} roughness={0.88} metalness={0.14}/>
      </mesh>
      {[-6.2, -3.2, 0, 3.2, 6.2].map((x) => <mesh key={x} position={[x, 3.1, -3.48]} castShadow>
        <boxGeometry args={[0.16, 6.2, 0.18]}/>
        <meshPhysicalMaterial {...mat.darkMetal}/>
      </mesh>)}
      {[1.1, 3.2, 5.15].map((y) => <mesh key={y} position={[0, y, -3.5]}>
        <boxGeometry args={[14.8, 0.11, 0.15]}/>
        <meshPhysicalMaterial {...mat.brushed}/>
      </mesh>)}
      {/* Overhead pipe racks */}
      <mesh position={[0, 5.2, -2.75]}>
        <boxGeometry args={[13.5, 0.13, 0.13]}/>
        <meshPhysicalMaterial {...mat.stainless}/>
      </mesh>
      {[-5.5, -2.7, 0, 2.7, 5.5].map((x) => <mesh key={x} position={[x, 4.65, -2.75]}>
        <boxGeometry args={[0.1, 1.1, 0.1]}/>
        <meshPhysicalMaterial {...mat.darkMetal}/>
      </mesh>)}
      <mesh position={[0, 5.0, -2.2]}>
        <cylinderGeometry args={[0.08, 0.08, 12.8, 32]}/>
        <meshPhysicalMaterial {...mat.stainless}/>
      </mesh>
    </group>
  );
}

function Scene({ values, scenario, risk, selected, setSelected, theme }) {
  const cavitation = scenario === 'cavitation' && risk >= 28 && values.running && values.sensorOnline && !values.solutionApplied;
  const air = scenario === 'air' && values.air >= 5 && values.running && !values.solutionApplied;
  const cavitationStrength = THREE.MathUtils.clamp(risk / 100, 0.08, 1);
  const background = theme === 'dark' ? '#121e26' : '#d9e1e2';
  const select = (id) => setSelected(id);
  return (
    <>
      <StudioEnvironment/>
      <color attach="background" args={[background]}/>
      <fog attach="fog" args={[background, 14, 28]}/>
      <ambientLight intensity={theme === 'dark' ? 0.52 : 0.82}/>
      <hemisphereLight args={['#e7f2f7', '#394b52', 1.0]}/>
      <directionalLight position={[4, 9, 7]} intensity={2.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-far={22}/>
      <directionalLight position={[-7, 5, -3]} intensity={1.45} color="#b5d0db"/>
      <spotLight position={[0, 7, 4]} angle={0.72} penumbra={0.8} intensity={1.6} distance={18} color="#f7fbff"/>
      <pointLight position={[-3, 3, 4]} intensity={0.7} color="#78c6df" distance={12}/>
      <IndustrialBackdrop theme={theme}/>
      {/* Concrete floor and skid foundation */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]} receiveShadow>
        <planeGeometry args={[22, 18]}/>
        <meshStandardMaterial color={theme === 'dark' ? '#465258' : '#a6b0b2'} roughness={0.92} metalness={0.04}/>
      </mesh>
      <gridHelper args={[18, 36, theme === 'dark' ? '#637178' : '#7d8c91', theme === 'dark' ? '#4d5b62' : '#929fa3']} position={[0, -0.125, 0]}/>
      <mesh position={[-0.15, -0.015, 0]} receiveShadow>
        <boxGeometry args={[10.4, 0.22, 4.85]}/>
        <meshPhysicalMaterial color="#52636a" metalness={0.64} roughness={0.48}/>
      </mesh>
      {/* Skid rails, foot pads and anchors */}
      {[-1.82, 1.82].map((z) => <mesh key={z} position={[-0.05, 0.13, z]} castShadow>
        <boxGeometry args={[10.1, 0.14, 0.16]}/>
        <meshPhysicalMaterial {...mat.stainless}/>
      </mesh>)}
      {[-4.2, -2.1, 0, 2.1, 4.0].map((x) => <mesh key={x} position={[x, 0.14, 0]} castShadow>
        <boxGeometry args={[0.15, 0.14, 3.75]}/>
        <meshPhysicalMaterial {...mat.darkMetal}/>
      </mesh>)}
      <Tank level={values.level} selected={selected === 'tank'} onSelect={select}/>
      {/* Suction line, expansion spool, flanges and valve */}
      <Tube points={SUCTION_PIPE_A} radius={0.14} selected={selected === 'suction'} onClick={() => select('suction')}/>
      <Tube points={SUCTION_PIPE_B} radius={0.13} material={SUCTION_PIPE_MATERIAL} selected={selected === 'suction'} onClick={() => select('suction')}/>
      <Flange position={[-2.26, 0.63, 0]} radius={0.22} selected={selected === 'suction'}/>
      <Flange position={[-0.91, 0.95, 0]} radius={0.22}/>
      <Valve position={[-2.55, 0.63, 0]} onClick={() => select('suction-valve')} selected={selected === 'suction-valve'} open={values.suctionValveOpen}/>
      <Pump running={values.running} cavitation={cavitation} cavitationStrength={cavitationStrength} selected={selected === 'pump'} onSelect={select}/>
      {/* Discharge pipe and riser */}
      <Tube points={DISCHARGE_PIPE} radius={0.13} selected={selected === 'discharge'} onClick={() => select('discharge')}/>
      <Flange position={[-0.55, 2.0, 0]} axis="y" radius={0.22}/>
      <Flange position={[3.2, 1.85, 0]} axis="y" radius={0.22}/>
      <Valve position={[2.72, 2.68, 0]} onClick={() => select('discharge-valve')} selected={selected === 'discharge-valve'} open={values.dischargeValveOpen}/>
      <Gauge position={[-1.45, 1.16, 0.18]} value={values.suction} warning={cavitation} offline={!values.sensorOnline} onClick={() => select('sensor-pressure')}/>
      <Gauge position={[1.08, 3.0, 0.18]} value={values.discharge} warning={values.discharge < 5} onClick={() => select('sensor-pressure')}/>
      <mesh position={[2.0, 2.68, 0.04]} onClick={() => select('sensor-flow')}>
        <cylinderGeometry args={[0.19, 0.19, 0.38, 40]}/>
        <meshPhysicalMaterial {...mat.brushed}/>
      </mesh>
      <mesh position={[2.0, 2.91, 0.04]} onClick={() => select('sensor-flow')}>
        <boxGeometry args={[0.42, 0.22, 0.3]}/>
        <meshPhysicalMaterial color="#1d3742" metalness={0.58} roughness={0.27}/>
      </mesh>
      <mesh position={[2.0, 2.92, 0.197]}>
        <planeGeometry args={[0.29, 0.1]}/>
        <meshBasicMaterial color="#75d8ac"/>
      </mesh>
      <Motor running={values.running} selected={selected === 'motor'} onSelect={select}/>
      {/* Coupling assembly and protective cage */}
      <mesh position={[0.43, 0.98, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.38, 32]}/>
        <meshPhysicalMaterial {...mat.stainless}/>
      </mesh>
      <mesh position={[0.43, 0.98, 0]}>
        <torusGeometry args={[0.2, 0.025, 12, 32]}/>
        <meshPhysicalMaterial color="#4c6069" metalness={0.88} roughness={0.3}/>
      </mesh>
      <mesh position={[0.43, 1.31, 0]} castShadow>
        <boxGeometry args={[0.5, 0.055, 0.75]}/>
        <meshPhysicalMaterial {...mat.stainless}/>
      </mesh>
      <mesh position={[0.43, 0.65, 0]} castShadow>
        <boxGeometry args={[0.5, 0.055, 0.75]}/>
        <meshPhysicalMaterial {...mat.stainless}/>
      </mesh>
      <FlowParticles active={values.running && values.suctionValveOpen && values.dischargeValveOpen} scenario={scenario} flow={values.flow}/>
      <Bubbles active={air} strength={values.air / 100} center={[-1.8, 0.66, 0.17]} count={28} color="#d3f0f4"/>
      {/* Low-level amber beacon */}
      {values.level < 30 && <mesh position={[-4.25, 4.18, 0]}>
        <sphereGeometry args={[0.075, 24, 24]}/>
        <meshBasicMaterial color="#ffad45" toneMapped={false}/>
      </mesh>}
      <ContactShadows position={[0, -0.12, 0]} opacity={0.3} scale={15} blur={2.1} far={5} resolution={256} frames={1}/>
    </>
  );
}


function SceneCameraRig({ controlsRef, selected, resetKey }) {
  const { camera } = useThree();
  const animating = useRef(true);
  const destination = useRef({
    position: new THREE.Vector3(8.6, 5.6, 10.8),
    target: new THREE.Vector3(-0.8, 1.55, 0)
  });

  useEffect(() => {
    animating.current = true;
    const defaultTarget = new THREE.Vector3(-0.8, 1.55, 0);
    const defaultPosition = new THREE.Vector3(8.6, 5.6, 10.8);
    const focus = {
      tank: { target: [-4.25, 1.85, 0], offset: [3.0, 2.0, 4.2] },
      'sensor-level': { target: [-4.25, 2.5, 0], offset: [2.0, 1.3, 3.2] },
      pump: { target: [-0.55, 1.05, 0], offset: [2.35, 1.45, 3.0] },
      motor: { target: [1.42, 1.0, 0], offset: [2.4, 1.4, 3.0] },
      suction: { target: [-2.1, 0.8, 0], offset: [2.4, 1.6, 3.2] },
      discharge: { target: [1.35, 2.65, 0], offset: [2.4, 1.5, 3.2] },
      'suction-valve': { target: [-2.55, 0.75, 0], offset: [1.8, 1.2, 2.4] },
      'discharge-valve': { target: [2.72, 2.75, 0], offset: [1.8, 1.2, 2.4] },
      'sensor-pressure': { target: [-1.45, 1.45, 0], offset: [1.8, 1.1, 2.4] },
      'sensor-flow': { target: [2.0, 2.75, 0], offset: [1.8, 1.1, 2.4] }
    };
    const selectedFocus = selected ? focus[selected] : null;
    if (!selectedFocus) {
      destination.current = { position: defaultPosition, target: defaultTarget };
    } else {
      const target = new THREE.Vector3(...selectedFocus.target);
      const offset = new THREE.Vector3(...selectedFocus.offset);
      destination.current = { position: target.clone().add(offset), target };
    }
  }, [selected, resetKey]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls || !animating.current) return;
    const blend = 1 - Math.exp(-delta * 4.2);
    camera.position.lerp(destination.current.position, blend);
    controls.target.lerp(destination.current.target, blend);
    controls.update();
    if (camera.position.distanceToSquared(destination.current.position) < 0.0004 && controls.target.distanceToSquared(destination.current.target) < 0.0004) {
      animating.current = false;
    }
  });
  return null;
}

export default function HydraulicScene({ values, scenario, risk = 0, selected, setSelected, theme, resetKey = 0, compact = false }) {
  const controlsRef = useRef(null);
  return (
    <div className={`scene-canvas ${compact ? 'scene-compact' : ''}`}>
      <Canvas
        shadows
        dpr={1}
        camera={{ position: [8.6, 5.6, 10.8], fov: 35, near: 0.1, far: 80 }}
        gl={{ antialias: false, alpha: false, powerPreference: 'low-power', stencil: false, depth: true, logarithmicDepthBuffer: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.16;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
        onPointerMissed={() => setSelected(null)}
      >
        <Scene values={values} scenario={scenario} risk={risk} selected={selected} setSelected={setSelected} theme={theme}/>
        <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.075} minDistance={3.2} maxDistance={18} maxPolarAngle={Math.PI / 2.02} minPolarAngle={0.18} target={[-0.8, 1.55, 0]}/>
        <SceneCameraRig controlsRef={controlsRef} selected={selected} resetKey={resetKey}/>
      </Canvas>
    </div>
  );
}
