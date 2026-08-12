import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { BalDoXAnimationState } from "../../constants/assistant";

interface BalDoXCharacter3DProps {
  state?: BalDoXAnimationState;
}

const ARMOR = "#1a1a22";
const GLOW = "#f59e0b";
const WING_BASE = "#0f0f14";
const WING_EDGE = "#d97706";
const WING_TIP = "#fcd34d";
const SWORD = "#a855f7";

const LERP = 0.06;

const STATE_SPEED: Record<BalDoXAnimationState, number> = {
  idle: 1,
  thinking: 1.4,
  scanning: 1.6,
  organizing: 1.2,
  success: 1.5,
  warning: 1.8,
};

const STATE_GLOW: Record<BalDoXAnimationState, number> = {
  idle: 0.42,
  thinking: 0.72,
  scanning: 0.62,
  organizing: 0.52,
  success: 1.0,
  warning: 0.38,
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

interface PoseTargets {
  bodyRotX: number;
  bodyRotY: number;
  bodyRotZ: number;
  bodyY: number;
  bodyX: number;
  headRotZ: number;
  headRotY: number;
  leftArmRotX: number;
  leftArmRotZ: number;
  rightArmRotX: number;
  rightArmRotZ: number;
  leftSwordRotX: number;
  leftSwordRotZ: number;
  rightSwordRotX: number;
  rightSwordRotZ: number;
  leftLegRotX: number;
  rightLegRotX: number;
  wingSpread: number;
  wingFlapAmp: number;
  glowMul: number;
}

function getPoseTargets(state: BalDoXAnimationState): PoseTargets {
  const base: PoseTargets = {
    bodyRotX: 0.18,
    bodyRotY: 0,
    bodyRotZ: 0,
    bodyY: 0,
    bodyX: 0,
    headRotZ: 0,
    headRotY: 0,
    leftArmRotX: 0.55,
    leftArmRotZ: 0.85,
    rightArmRotX: 0.35,
    rightArmRotZ: -0.65,
    leftSwordRotX: -0.15,
    leftSwordRotZ: -0.55,
    rightSwordRotX: 0.45,
    rightSwordRotZ: 0.35,
    leftLegRotX: 0,
    rightLegRotX: 0,
    wingSpread: 0.35,
    wingFlapAmp: 0.18,
    glowMul: 1,
  };

  switch (state) {
    case "thinking":
      return {
        ...base,
        bodyRotX: 0.12,
        headRotZ: 0.12,
        headRotY: -0.15,
        leftArmRotX: 0.3,
        leftArmRotZ: 0.5,
        leftSwordRotX: -0.6,
        leftSwordRotZ: -0.2,
        rightArmRotX: 0.5,
        rightArmRotZ: -0.55,
        wingSpread: 0.25,
        wingFlapAmp: 0.1,
        glowMul: 1.3,
      };
    case "scanning":
      return {
        ...base,
        bodyRotX: 0.1,
        headRotY: 0,
        leftArmRotX: 0.45,
        leftArmRotZ: 0.7,
        rightArmRotX: 0.45,
        rightArmRotZ: -0.7,
        leftSwordRotX: 0.1,
        leftSwordRotZ: -0.4,
        rightSwordRotX: 0.1,
        rightSwordRotZ: 0.4,
        wingSpread: 0.55,
        wingFlapAmp: 0.08,
        glowMul: 1.15,
      };
    case "organizing":
      return {
        ...base,
        bodyRotX: 0.22,
        bodyRotZ: 0.05,
        leftArmRotX: 0.7,
        leftArmRotZ: 0.4,
        rightArmRotX: 0.85,
        rightArmRotZ: -0.35,
        leftSwordRotX: 0.5,
        leftSwordRotZ: 0.1,
        rightSwordRotX: 0.7,
        rightSwordRotZ: 0.15,
        wingSpread: 0.28,
        wingFlapAmp: 0.12,
        glowMul: 1.05,
      };
    case "success":
      return {
        ...base,
        bodyRotX: -0.05,
        bodyRotY: 0,
        headRotZ: 0,
        leftArmRotX: -0.3,
        leftArmRotZ: 0.9,
        rightArmRotX: -0.3,
        rightArmRotZ: -0.9,
        leftSwordRotX: -0.8,
        leftSwordRotZ: -0.3,
        rightSwordRotX: -0.8,
        rightSwordRotZ: 0.3,
        wingSpread: 0.7,
        wingFlapAmp: 0.35,
        glowMul: 1.6,
      };
    case "warning":
      return {
        ...base,
        bodyRotX: 0.25,
        bodyRotZ: 0.08,
        leftArmRotX: 0.6,
        leftArmRotZ: 1.0,
        rightArmRotX: 0.6,
        rightArmRotZ: -1.0,
        leftSwordRotX: 0.2,
        leftSwordRotZ: -0.7,
        rightSwordRotX: 0.2,
        rightSwordRotZ: 0.7,
        wingSpread: 0.45,
        wingFlapAmp: 0.22,
        glowMul: 0.7,
      };
    default:
      return base;
  }
}

function ArmorMaterial({
  emissiveIntensity = 0.6,
  materialRef,
}: {
  emissiveIntensity?: number;
  materialRef?: React.RefObject<THREE.MeshStandardMaterial | null>;
}) {
  return (
    <meshStandardMaterial
      ref={materialRef}
      color={ARMOR}
      emissive={GLOW}
      emissiveIntensity={emissiveIntensity}
      metalness={0.85}
      roughness={0.25}
    />
  );
}

function Wing({ side }: { side: "left" | "right" }) {
  const sign = side === "left" ? -1 : 1;
  const segments = 6;

  return (
    <group rotation={[0.15, sign * 0.35, sign * 0.25]} position={[sign * 0.42, 0.65, -0.28]}>
      {Array.from({ length: segments }).map((_, i) => {
        const t = i / (segments - 1);
        const len = 0.65 + t * 1.45;
        const angle = sign * (0.12 + t * 0.78);
        const yOff = t * 1.05;
        const zOff = -t * 0.18;

        return (
          <group key={i} rotation={[0, 0, angle]} position={[sign * t * 0.14, yOff, zOff]}>
            <mesh position={[sign * len * 0.5, 0, 0]}>
              <boxGeometry args={[len, 0.07, 0.2]} />
              <meshStandardMaterial color={WING_BASE} metalness={0.6} roughness={0.5} />
            </mesh>
            <mesh position={[sign * len * 0.92, 0, 0]}>
              <boxGeometry args={[len * 0.2, 0.05, 0.14]} />
              <meshStandardMaterial
                color={WING_EDGE}
                emissive={WING_TIP}
                emissiveIntensity={0.75}
                metalness={0.3}
                roughness={0.45}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Sword({
  position,
  rotation,
  swordRef,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  swordRef?: React.RefObject<THREE.Group | null>;
}) {
  return (
    <group ref={swordRef} position={position} rotation={rotation}>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[0.11, 1.2, 0.045]} />
        <meshStandardMaterial
          color={SWORD}
          emissive={SWORD}
          emissiveIntensity={0.55}
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.3, 0.07, 0.07]} />
        <ArmorMaterial emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, -0.14, 0]}>
        <cylinderGeometry args={[0.038, 0.038, 0.3, 6]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

function EmberParticles({
  wingSide,
  burstRef,
}: {
  wingSide: "left" | "right";
  burstRef: React.RefObject<number>;
}) {
  const ref = useRef<THREE.Points>(null);
  const sign = wingSide === "left" ? -1 : 1;
  const count = 28;

  const { positions, velocities, baseY } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const by = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = sign * (0.8 + Math.random() * 1.6);
      pos[i * 3 + 1] = 0.5 + Math.random() * 1.6;
      pos[i * 3 + 2] = -0.35 + Math.random() * 0.5;
      vel[i * 3] = sign * (Math.random() - 0.5) * 0.004;
      vel[i * 3 + 1] = 0.005 + Math.random() * 0.008;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.003;
      by[i] = pos[i * 3 + 1];
    }
    return { positions: pos, velocities: vel, baseY: by };
  }, [sign, count]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const burst = burstRef.current;
    const speedMul = 1 + burst * 3;
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    const mat = ref.current.material as THREE.PointsMaterial;
    mat.opacity = lerp(mat.opacity, 0.55 + burst * 0.35, 0.15);

    for (let i = 0; i < count; i++) {
      pos[i * 3] += velocities[i * 3] * delta * 60 * speedMul;
      pos[i * 3 + 1] += velocities[i * 3 + 1] * delta * 60 * speedMul;
      pos[i * 3 + 2] += velocities[i * 3 + 2] * delta * 60 * speedMul;
      if (pos[i * 3 + 1] > 2.6) {
        pos[i * 3] = sign * (0.8 + Math.random() * 1.6);
        pos[i * 3 + 1] = baseY[i] * 0.4 + Math.random() * 0.4;
        pos[i * 3 + 2] = -0.35 + Math.random() * 0.5;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref} position={[0, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={WING_TIP}
        size={0.07}
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function BalDoXCharacter3D({ state = "idle" }: BalDoXCharacter3DProps) {
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const wingsRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Group>(null);
  const rightWingRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftSwordRef = useRef<THREE.Group>(null);
  const rightSwordRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const torsoMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const helmetMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const emberBurstRef = useRef(0);
  const prevFlapPhase = useRef(0);
  const scanAngleRef = useRef(0);
  const walkPhaseRef = useRef(0);

  const currentPose = useRef(getPoseTargets("idle"));
  const targetPose = useRef(getPoseTargets("idle"));
  const currentGlow = useRef(STATE_GLOW.idle);

  useEffect(() => {
    targetPose.current = getPoseTargets(state);
  }, [state]);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const speed = STATE_SPEED[state];
    const targetGlow = STATE_GLOW[state];
    currentGlow.current = lerp(currentGlow.current, targetGlow, LERP);

    const tp = targetPose.current;
    const cp = currentPose.current;
    cp.bodyRotX = lerp(cp.bodyRotX, tp.bodyRotX, LERP);
    cp.bodyRotY = lerpAngle(cp.bodyRotY, tp.bodyRotY, LERP);
    cp.bodyRotZ = lerpAngle(cp.bodyRotZ, tp.bodyRotZ, LERP);
    cp.bodyY = lerp(cp.bodyY, tp.bodyY, LERP);
    cp.bodyX = lerp(cp.bodyX, tp.bodyX, LERP);
    cp.headRotZ = lerpAngle(cp.headRotZ, tp.headRotZ, LERP);
    cp.headRotY = lerpAngle(cp.headRotY, tp.headRotY, LERP);
    cp.leftArmRotX = lerp(cp.leftArmRotX, tp.leftArmRotX, LERP);
    cp.leftArmRotZ = lerpAngle(cp.leftArmRotZ, tp.leftArmRotZ, LERP);
    cp.rightArmRotX = lerp(cp.rightArmRotX, tp.rightArmRotX, LERP);
    cp.rightArmRotZ = lerpAngle(cp.rightArmRotZ, tp.rightArmRotZ, LERP);
    cp.leftSwordRotX = lerp(cp.leftSwordRotX, tp.leftSwordRotX, LERP);
    cp.leftSwordRotZ = lerpAngle(cp.leftSwordRotZ, tp.leftSwordRotZ, LERP);
    cp.rightSwordRotX = lerp(cp.rightSwordRotX, tp.rightSwordRotX, LERP);
    cp.rightSwordRotZ = lerpAngle(cp.rightSwordRotZ, tp.rightSwordRotZ, LERP);
    cp.leftLegRotX = lerp(cp.leftLegRotX, tp.leftLegRotX, LERP);
    cp.rightLegRotX = lerp(cp.rightLegRotX, tp.rightLegRotX, LERP);
    cp.wingSpread = lerp(cp.wingSpread, tp.wingSpread, LERP);
    cp.wingFlapAmp = lerp(cp.wingFlapAmp, tp.wingFlapAmp, LERP);
    cp.glowMul = lerp(cp.glowMul, tp.glowMul, LERP);

    const breathe = Math.sin(t * 1.4 * speed) * 0.025;
    const hover = Math.sin(t * 0.7) * 0.08;
    const glowPulse = (Math.sin(t * 1.4 * speed) * 0.5 + 0.5) * 0.25;
    const emissive = currentGlow.current * cp.glowMul * (1 + glowPulse);

    if (torsoMatRef.current) torsoMatRef.current.emissiveIntensity = emissive;
    if (helmetMatRef.current) helmetMatRef.current.emissiveIntensity = emissive;

    let walkCycle = 0;
    if (state === "idle" || state === "organizing") {
      walkPhaseRef.current += delta * 1.8;
      walkCycle = Math.sin(walkPhaseRef.current);
    }

    let scanRotY = 0;
    if (state === "scanning") {
      scanAngleRef.current += delta * 0.9;
      scanRotY = Math.sin(scanAngleRef.current) * 0.5;
    }

    let successBounce = 0;
    if (state === "success") {
      successBounce = Math.abs(Math.sin(t * 3.5)) * 0.08;
    }

    let warningShake = 0;
    if (state === "warning") {
      warningShake = Math.sin(t * 8) * 0.04;
    }

    const swordSwayL = Math.sin(t * 1.2 * speed + 0.5) * 0.06;
    const swordSwayR = Math.sin(t * 1.2 * speed + 2.0) * 0.06;

    const flapPhase = t * 1.1 * speed;
    const flapCurve = Math.sin(flapPhase);
    const flapPower = Math.pow(Math.max(0, flapCurve), 2) * cp.wingFlapAmp;
    const flapReturn = Math.sin(flapPhase) * cp.wingFlapAmp * 0.6;

    if (Math.sin(flapPhase) > 0.85 && prevFlapPhase.current <= 0.85) {
      emberBurstRef.current = 1;
    }
    emberBurstRef.current = lerp(emberBurstRef.current, 0, 0.08);
    prevFlapPhase.current = Math.sin(flapPhase);

    if (bodyRef.current) {
      const idleTurn = state === "idle" ? Math.sin(t * 0.35) * 0.12 : 0;
      bodyRef.current.rotation.x = cp.bodyRotX + breathe * 0.3;
      bodyRef.current.rotation.y = cp.bodyRotY + scanRotY + idleTurn;
      bodyRef.current.rotation.z = cp.bodyRotZ + warningShake;
      bodyRef.current.position.y = hover + cp.bodyY + breathe + successBounce;
      bodyRef.current.position.x = cp.bodyX;
    }

    if (headRef.current) {
      headRef.current.rotation.z = cp.headRotZ + (state === "thinking" ? Math.sin(t * 2) * 0.04 : 0);
      headRef.current.rotation.y = cp.headRotY + (state === "scanning" ? scanRotY * 0.6 : 0);
    }

    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = cp.leftArmRotX + swordSwayL * 0.3;
      leftArmRef.current.rotation.z = cp.leftArmRotZ;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = cp.rightArmRotX + swordSwayR * 0.3;
      rightArmRef.current.rotation.z = cp.rightArmRotZ;
    }

    if (leftSwordRef.current) {
      leftSwordRef.current.rotation.x = cp.leftSwordRotX + swordSwayL;
      leftSwordRef.current.rotation.z = cp.leftSwordRotZ + swordSwayL * 0.5;
    }
    if (rightSwordRef.current) {
      rightSwordRef.current.rotation.x = cp.rightSwordRotX + swordSwayR;
      rightSwordRef.current.rotation.z = cp.rightSwordRotZ + swordSwayR * 0.5;
    }

    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = cp.leftLegRotX + walkCycle * 0.18;
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = cp.rightLegRotX - walkCycle * 0.18;
    }

    const wingBaseZ = 0.3 + cp.wingSpread;
    if (leftWingRef.current) {
      leftWingRef.current.rotation.z = wingBaseZ + flapReturn - flapPower;
    }
    if (rightWingRef.current) {
      rightWingRef.current.rotation.z = -wingBaseZ - flapReturn + flapPower;
    }

    if (wingsRef.current && state === "success") {
      wingsRef.current.scale.setScalar(1 + Math.sin(t * 2.5) * 0.08);
    } else if (wingsRef.current) {
      wingsRef.current.scale.setScalar(1);
    }
  });

  const warningTint = state === "warning";
  const baseEmissive = currentGlow.current;

  return (
    <group>
      <group ref={bodyRef}>
        <group ref={wingsRef}>
          <group ref={leftWingRef}>
            <Wing side="left" />
          </group>
          <group ref={rightWingRef}>
            <Wing side="right" />
          </group>
          <EmberParticles wingSide="left" burstRef={emberBurstRef} />
          <EmberParticles wingSide="right" burstRef={emberBurstRef} />
        </group>

        <group ref={headRef} position={[0, 1.42, 0.02]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.46, 0.4, 0.4]} />
            <meshStandardMaterial
              ref={helmetMatRef}
              color={warningTint ? "#b45309" : ARMOR}
              emissive={warningTint ? "#fbbf24" : GLOW}
              emissiveIntensity={baseEmissive}
              metalness={0.85}
              roughness={0.25}
            />
          </mesh>
          {[-0.14, 0, 0.14].map((x) => (
            <mesh key={x} position={[x, 0.28, 0]} rotation={[0.3, 0, 0]}>
              <coneGeometry args={[0.055, 0.24, 4]} />
              <ArmorMaterial emissiveIntensity={baseEmissive} />
            </mesh>
          ))}
          <mesh position={[0, -0.04, 0.21]}>
            <boxGeometry args={[0.32, 0.07, 0.04]} />
          <meshStandardMaterial
            color={GLOW}
            emissive={GLOW}
            emissiveIntensity={state === "thinking" ? 1.2 : 0.85}
            metalness={0.5}
            roughness={0.35}
          />
          </mesh>
        </group>

        <mesh position={[0, 0.78, 0.03]}>
          <boxGeometry args={[0.68, 0.72, 0.38]} />
          <meshStandardMaterial
            ref={torsoMatRef}
            color={warningTint ? "#b45309" : ARMOR}
            emissive={warningTint ? "#fbbf24" : GLOW}
            emissiveIntensity={baseEmissive}
            metalness={0.85}
            roughness={0.25}
          />
        </mesh>
        <mesh position={[0, 0.82, 0.22]}>
          <octahedronGeometry args={[0.09, 0]} />
          <meshStandardMaterial
            color={GLOW}
            emissive={GLOW}
            emissiveIntensity={state === "scanning" ? 1.3 : 0.95}
            metalness={0.6}
            roughness={0.25}
          />
        </mesh>

        {([-1, 1] as const).map((side) => (
          <group key={side} position={[side * 0.48, 1.08, 0]}>
            <mesh rotation={[0, 0, side * 0.35]}>
              <boxGeometry args={[0.34, 0.2, 0.34]} />
              <ArmorMaterial emissiveIntensity={baseEmissive} />
            </mesh>
            <mesh position={[side * 0.1, 0.16, 0]} rotation={[0.4, 0, side * 0.55]}>
              <coneGeometry args={[0.08, 0.22, 4]} />
              <ArmorMaterial emissiveIntensity={baseEmissive + 0.2} />
            </mesh>
          </group>
        ))}

        <mesh position={[0, 0.36, 0.02]}>
          <boxGeometry args={[0.56, 0.2, 0.34]} />
          <ArmorMaterial emissiveIntensity={baseEmissive * 0.8} />
        </mesh>

        <group ref={leftLegRef} position={[-0.16, 0, 0.04]}>
          <mesh position={[0, -0.06, 0]}>
            <boxGeometry args={[0.2, 0.38, 0.24]} />
            <ArmorMaterial emissiveIntensity={baseEmissive * 0.7} />
          </mesh>
          <mesh position={[0, -0.34, 0.05]}>
            <boxGeometry args={[0.22, 0.2, 0.3]} />
            <ArmorMaterial emissiveIntensity={baseEmissive * 0.6} />
          </mesh>
        </group>
        <group ref={rightLegRef} position={[0.16, 0, 0.04]}>
          <mesh position={[0, -0.06, 0]}>
            <boxGeometry args={[0.2, 0.38, 0.24]} />
            <ArmorMaterial emissiveIntensity={baseEmissive * 0.7} />
          </mesh>
          <mesh position={[0, -0.34, 0.05]}>
            <boxGeometry args={[0.22, 0.2, 0.3]} />
            <ArmorMaterial emissiveIntensity={baseEmissive * 0.6} />
          </mesh>
        </group>

        <group ref={leftArmRef} position={[-0.52, 0.88, 0.12]}>
          <mesh position={[0, -0.16, 0]}>
            <boxGeometry args={[0.16, 0.38, 0.16]} />
            <ArmorMaterial emissiveIntensity={baseEmissive * 0.7} />
          </mesh>
          <Sword
            swordRef={leftSwordRef}
            position={[0, -0.12, 0.18]}
            rotation={[0, 0, 0]}
          />
        </group>
        <group ref={rightArmRef} position={[0.52, 0.88, 0.12]}>
          <mesh position={[0, -0.16, 0]}>
            <boxGeometry args={[0.16, 0.38, 0.16]} />
            <ArmorMaterial emissiveIntensity={baseEmissive * 0.7} />
          </mesh>
          <Sword
            swordRef={rightSwordRef}
            position={[0, -0.12, 0.18]}
            rotation={[0, 0, 0]}
          />
        </group>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.44, 0]}>
          <ringGeometry args={[0.38, 0.62, 32]} />
          <meshBasicMaterial
            color={warningTint ? "#fbbf24" : GLOW}
            transparent
            opacity={0.22}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}
