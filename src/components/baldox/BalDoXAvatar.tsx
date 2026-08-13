import { Suspense, useLayoutEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import type { BalDoXAnimationState } from "../../constants/assistant";
import { BalDoXCharacter3D } from "./BalDoXCharacter3D";

interface BalDoXAvatarProps {
  state?: BalDoXAnimationState;
  className?: string;
  size?: "sm" | "lg";
  variant?: "default" | "companion";
  walkDirection?: 1 | -1;
}

const STATE_RING: Record<BalDoXAnimationState, string> = {
  idle: "baldox-ring-idle",
  walking: "baldox-ring-walking",
  thinking: "baldox-ring-thinking",
  scanning: "baldox-ring-scanning",
  organizing: "baldox-ring-organizing",
  success: "baldox-ring-success",
  warning: "baldox-ring-warning",
};

const STATE_BODY: Record<BalDoXAnimationState, string> = {
  idle: "baldox-body-idle",
  walking: "baldox-body-walking",
  thinking: "baldox-body-thinking",
  scanning: "baldox-body-scanning",
  organizing: "baldox-body-organizing",
  success: "baldox-body-success",
  warning: "baldox-body-warning",
};

function BalDoXAvatarSVG({ state = "idle", className = "" }: BalDoXAvatarProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div className={`relative ${STATE_BODY[state]}`}>
        <svg
          viewBox="0 0 200 240"
          className="h-full w-full drop-shadow-[0_0_24px_rgba(34,211,238,0.25)]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="baldox-head" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="baldox-body" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="baldox-accent" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <filter id="baldox-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g className="baldox-antenna">
            <line x1="100" y1="28" x2="100" y2="8" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
            <circle cx="100" cy="6" r="5" fill="#22d3ee" filter="url(#baldox-glow)" />
          </g>

          <rect x="55" y="28" width="90" height="72" rx="18" fill="url(#baldox-head)" />
          <rect x="62" y="35" width="76" height="58" rx="14" fill="#0f172a" opacity="0.35" />

          <g className="baldox-eyes">
            <rect x="72" y="52" width="22" height="14" rx="4" fill="#e0f2fe" />
            <rect x="106" y="52" width="22" height="14" rx="4" fill="#e0f2fe" />
            <rect x="78" y="56" width="10" height="6" rx="2" fill="#06b6d4" className="baldox-pupil-left" />
            <rect x="112" y="56" width="10" height="6" rx="2" fill="#06b6d4" className="baldox-pupil-right" />
          </g>

          <rect x="82" y="78" width="36" height="4" rx="2" fill="#22d3ee" opacity="0.8" className="baldox-mouth" />
          <rect x="88" y="100" width="24" height="12" rx="4" fill="#475569" />
          <rect x="48" y="112" width="104" height="88" rx="16" fill="url(#baldox-body)" />
          <rect x="58" y="122" width="84" height="56" rx="10" fill="#0f172a" opacity="0.4" />
          <rect x="72" y="132" width="56" height="36" rx="8" fill="none" stroke="url(#baldox-accent)" strokeWidth="2" />
          <circle cx="100" cy="150" r="10" fill="none" stroke="#22d3ee" strokeWidth="2" className="baldox-core" />
          <circle cx="100" cy="150" r="4" fill="#22d3ee" className="baldox-core-dot" />
          <rect x="58" y="122" width="84" height="3" rx="1.5" fill="#22d3ee" opacity="0" className="baldox-scan-line" />

          <g className="baldox-arm-left">
            <rect x="28" y="118" width="24" height="52" rx="10" fill="#475569" />
            <rect x="22" y="164" width="20" height="24" rx="8" fill="url(#baldox-head)" />
          </g>
          <g className="baldox-arm-right">
            <rect x="148" y="118" width="24" height="52" rx="10" fill="#475569" />
            <rect x="158" y="164" width="20" height="24" rx="8" fill="url(#baldox-head)" />
          </g>

          <rect x="68" y="200" width="28" height="28" rx="8" fill="#475569" />
          <rect x="104" y="200" width="28" height="28" rx="8" fill="#475569" />
          <ellipse cx="100" cy="232" rx="52" ry="6" fill="#22d3ee" opacity="0.15" className="baldox-shadow" />
        </svg>
      </div>
    </div>
  );
}

const SIZE_PRESETS = {
  sm: { scale: 0.72, cameraY: 0.46, cameraZ: 3.25, fov: 46, lookAtY: 0.42 },
  lg: { scale: 0.58, cameraY: 0.5, cameraZ: 4.35, fov: 42, lookAtY: 0.46 },
} as const;

function CameraRig({ preset }: { preset: (typeof SIZE_PRESETS)[keyof typeof SIZE_PRESETS] }) {
  const { camera } = useThree();

  useLayoutEffect(() => {
    camera.position.set(0, preset.cameraY, preset.cameraZ);
    camera.lookAt(0, preset.lookAtY, 0);
    if ("fov" in camera) {
      camera.fov = preset.fov;
      camera.near = 0.1;
      camera.far = 50;
      camera.updateProjectionMatrix();
    }
  }, [camera, preset]);

  return null;
}

function SceneLighting({ size = "lg" }: { size?: "sm" | "lg" }) {
  const boost = size === "sm" ? 1.4 : 1;

  return (
    <>
      <ambientLight intensity={0.58 * boost} color="#b8e0d8" />
      <directionalLight position={[3, 5, 4]} intensity={1.15 * boost} color="#e8fff5" castShadow={false} />
      <directionalLight position={[-3, 2.5, -2]} intensity={0.5 * boost} color="#7dd3fc" />
      <pointLight position={[1.5, 2.5, 3]} intensity={0.6 * boost} color="#34d399" distance={8} decay={2} />
      <pointLight position={[-1.8, 1.2, 2.5]} intensity={0.38 * boost} color="#fb923c" distance={7} decay={2} />
      <pointLight position={[0, -0.5, 1.5]} intensity={0.22 * boost} color="#0d9488" distance={5} decay={2} />
    </>
  );
}

function GroundStage() {
  return (
    <group position={[0, -0.48, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.35, 40]} />
        <meshStandardMaterial color="#0c1524" roughness={0.92} metalness={0.08} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[0.5, 0.72, 40]} />
        <meshBasicMaterial color="#2dd4a8" transparent opacity={0.32} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <ringGeometry args={[0.88, 1.02, 40]} />
        <meshBasicMaterial color="#2dd4a8" transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
  );
}

function BalDoXAvatarCanvas({
  state = "idle",
  size = "lg",
  walkDirection = 1,
  showStage = true,
}: {
  state?: BalDoXAnimationState;
  size?: "sm" | "lg";
  walkDirection?: 1 | -1;
  showStage?: boolean;
}) {
  const preset = SIZE_PRESETS[size];

  return (
    <Canvas
      dpr={[1, 2]}
      frameloop="always"
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [0, preset.cameraY, preset.cameraZ], fov: preset.fov, near: 0.1, far: 50 }}
      style={{ background: "transparent", width: "100%", height: "100%" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMappingExposure = 1.12;
      }}
    >
      <CameraRig preset={preset} />
      <SceneLighting size={size} />
      <Suspense fallback={null}>
        <group scale={preset.scale} position={[0, -0.06, 0]}>
          <BalDoXCharacter3D state={state} walkDirection={walkDirection} />
        </group>
        {showStage && (
          <>
            <GroundStage />
            <ContactShadows
              position={[0, -0.47, 0]}
              opacity={0.35}
              scale={2.4}
              blur={2.2}
              far={1.2}
              color="#2dd4a8"
            />
          </>
        )}
      </Suspense>
    </Canvas>
  );
}

export function BalDoXAvatar({
  state = "idle",
  className = "",
  size = "lg",
  variant = "default",
  walkDirection = 1,
}: BalDoXAvatarProps) {
  const isCompanion = variant === "companion";

  return (
    <div
      className={`relative flex items-center justify-center overflow-visible ${className}`}
      aria-label={`BalDoX — estado ${state}`}
      role="img"
    >
      {!isCompanion && (
        <div
          className={`absolute -inset-3 rounded-full blur-2xl transition-opacity duration-500 ${STATE_RING[state]}`}
          aria-hidden
        />
      )}

      <div
        className={
          isCompanion
            ? `relative h-full w-full overflow-visible ${STATE_BODY[state]}`
            : `relative h-full w-full overflow-visible rounded-2xl bg-gradient-to-b from-slate-900/90 via-teal-950/50 to-slate-950/95 ring-1 ring-cyan-500/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${STATE_BODY[state]}`
        }
      >
        <Suspense fallback={<BalDoXAvatarSVG state={state} className="h-full w-full" />}>
          <BalDoXAvatarCanvas
            state={state}
            size={size}
            walkDirection={walkDirection}
            showStage={!isCompanion}
          />
        </Suspense>
      </div>
    </div>
  );
}
