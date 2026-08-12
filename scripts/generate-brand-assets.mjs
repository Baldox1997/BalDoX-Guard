import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

const heroSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" fill="none">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f1117"/>
      <stop offset="45%" stop-color="#16161e"/>
      <stop offset="100%" stop-color="#1a1524"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="45%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <linearGradient id="gold-soft" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0"/>
      <stop offset="50%" stop-color="#f59e0b" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#fcd34d" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="purple-blade" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="50%" stop-color="#c084fc"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
    <radialGradient id="hero-glow" cx="58%" cy="42%" r="42%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.22"/>
      <stop offset="55%" stop-color="#a855f7" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#0f1117" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="particle-glow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="3"/>
    </filter>
  </defs>

  <rect width="1280" height="720" fill="url(#bg)"/>
  <rect width="1280" height="720" fill="url(#hero-glow)"/>
  <rect y="680" width="1280" height="40" fill="url(#gold-soft)"/>

  <!-- Grid / tech overlay -->
  <g opacity="0.06" stroke="#f59e0b" stroke-width="1">
    <line x1="0" y1="120" x2="1280" y2="120"/>
    <line x1="0" y1="240" x2="1280" y2="240"/>
    <line x1="0" y1="360" x2="1280" y2="360"/>
    <line x1="0" y1="480" x2="1280" y2="480"/>
    <line x1="0" y1="600" x2="1280" y2="600"/>
    <line x1="160" y1="0" x2="160" y2="720"/>
    <line x1="320" y1="0" x2="320" y2="720"/>
    <line x1="480" y1="0" x2="480" y2="720"/>
    <line x1="640" y1="0" x2="640" y2="720"/>
    <line x1="800" y1="0" x2="800" y2="720"/>
    <line x1="960" y1="0" x2="960" y2="720"/>
    <line x1="1120" y1="0" x2="1120" y2="720"/>
  </g>

  <!-- Gold particles -->
  <g filter="url(#particle-glow)" opacity="0.75">
    <circle cx="180" cy="140" r="2.5" fill="#fcd34d"/>
    <circle cx="920" cy="96" r="2" fill="#f59e0b"/>
    <circle cx="1080" cy="220" r="3" fill="#fde68a"/>
    <circle cx="240" cy="520" r="2" fill="#fbbf24"/>
    <circle cx="1140" cy="480" r="2.5" fill="#fcd34d"/>
    <circle cx="760" cy="620" r="2" fill="#f59e0b"/>
    <circle cx="420" cy="180" r="1.5" fill="#fde68a"/>
    <circle cx="1020" cy="580" r="2" fill="#fbbf24"/>
  </g>

  <!-- Mount silhouette -->
  <ellipse cx="640" cy="610" rx="280" ry="42" fill="#0a0a0f" opacity="0.85"/>
  <path d="M420 580 C480 540 560 530 640 540 C720 530 800 540 860 580 L840 620 C760 600 680 595 640 598 C600 595 520 600 440 620 Z" fill="#12121a"/>
  <path d="M440 600 C500 565 580 555 640 562 C700 555 780 565 840 600" stroke="#f59e0b" stroke-width="1.5" stroke-opacity="0.25" fill="none"/>

  <!-- Wings -->
  <path d="M520 260 C420 180 300 190 250 280 C310 250 400 240 470 270 L500 310 Z" fill="#08080d" stroke="#f59e0b" stroke-width="1.2" stroke-opacity="0.35"/>
  <path d="M760 260 C860 180 980 190 1030 280 C970 250 880 240 810 270 L780 310 Z" fill="#08080d" stroke="#f59e0b" stroke-width="1.2" stroke-opacity="0.35"/>
  <path d="M500 310 C450 340 420 390 440 450 C470 410 490 360 520 320 Z" fill="#0d0d14" opacity="0.9"/>
  <path d="M780 310 C830 340 860 390 840 450 C810 410 790 360 760 320 Z" fill="#0d0d14" opacity="0.9"/>

  <!-- Warrior body -->
  <path d="M580 300 L700 300 L720 380 L700 480 L620 500 L560 480 L540 380 Z" fill="#14141c" stroke="url(#gold)" stroke-width="2"/>
  <path d="M600 320 L680 320 L690 370 L670 430 L610 440 L590 370 Z" fill="#1c1c26"/>
  <path d="M610 350 L670 350 L665 390 L615 395 Z" fill="url(#gold)" opacity="0.85"/>
  <path d="M595 410 L685 410 L675 455 L605 455 Z" fill="#d97706" opacity="0.5"/>

  <!-- Helmet -->
  <path d="M590 250 L690 250 L705 290 L695 320 L585 320 L575 290 Z" fill="#12121a" stroke="url(#gold)" stroke-width="2"/>
  <path d="M605 255 L675 255 L685 275 L605 275 Z" fill="url(#gold)" opacity="0.95"/>
  <rect x="628" y="285" width="24" height="8" rx="2" fill="#0f0f14"/>
  <circle cx="640" cy="272" r="6" fill="#fcd34d" filter="url(#soft-glow)"/>

  <!-- Shoulder pads -->
  <path d="M555 310 C530 300 520 330 535 350 L565 345 Z" fill="#1a1a22" stroke="#f59e0b" stroke-width="1"/>
  <path d="M725 310 C750 300 760 330 745 350 L715 345 Z" fill="#1a1a22" stroke="#f59e0b" stroke-width="1"/>

  <!-- Purple energy sword -->
  <path d="M710 330 L980 180 L995 200 L730 360 Z" fill="url(#purple-blade)" filter="url(#soft-glow)"/>
  <path d="M710 330 L730 360 L720 368 L700 338 Z" fill="#6d28d9"/>
  <path d="M980 180 L995 200 L990 205 L975 185 Z" fill="#e9d5ff" opacity="0.8"/>
  <ellipse cx="850" cy="265" rx="90" ry="12" fill="#a855f7" opacity="0.15" transform="rotate(-28 850 265)"/>

  <!-- Shield emblem -->
  <path d="M640 395 L655 420 L640 445 L625 420 Z" fill="none" stroke="#a855f7" stroke-width="2" opacity="0.7"/>
  <circle cx="640" cy="420" r="6" fill="#c084fc" opacity="0.8"/>

  <!-- Foreground glow arc -->
  <path d="M120 680 C320 620 520 600 640 598 C760 600 960 620 1160 680" stroke="#f59e0b" stroke-width="2" stroke-opacity="0.2" fill="none"/>
</svg>`;

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f1117"/>
      <stop offset="100%" stop-color="#1a1524"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="45%" r="50%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.35"/>
      <stop offset="70%" stop-color="#a855f7" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#0f1117" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow-filter" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <rect x="2" y="2" width="508" height="508" rx="94" stroke="url(#gold)" stroke-width="3" stroke-opacity="0.45"/>
  <circle cx="256" cy="240" r="160" fill="url(#glow)"/>

  <!-- Minimal helmet silhouette -->
  <path d="M156 280 C156 210 200 150 256 130 C312 150 356 210 356 280 L340 340 C330 370 300 390 256 395 C212 390 182 370 172 340 Z"
        fill="#12121a" stroke="url(#gold)" stroke-width="6" filter="url(#glow-filter)"/>
  <path d="M196 200 C210 175 230 160 256 155 C282 160 302 175 316 200 L300 230 C290 215 275 205 256 202 C237 205 222 215 212 230 Z"
        fill="url(#gold)" opacity="0.95"/>
  <rect x="216" y="248" width="80" height="24" rx="6" fill="#0a0a0f"/>
  <path d="M256 130 L256 110" stroke="#a855f7" stroke-width="4" stroke-linecap="round"/>
  <circle cx="256" cy="102" r="8" fill="#c084fc" filter="url(#glow-filter)"/>

  <!-- Wing hints -->
  <path d="M156 260 C110 230 90 280 110 320 C130 295 145 275 156 280 Z" fill="#08080d" stroke="#f59e0b" stroke-width="2" stroke-opacity="0.4"/>
  <path d="M356 260 C402 230 422 280 402 320 C382 295 367 275 356 280 Z" fill="#08080d" stroke="#f59e0b" stroke-width="2" stroke-opacity="0.4"/>

  <!-- Purple accent -->
  <path d="M236 360 L256 400 L276 360 Z" fill="#a855f7" opacity="0.75"/>
</svg>`;

function svgToPng(svg, width, height, filename) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background: "transparent",
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  const outPath = join(publicDir, filename);
  writeFileSync(outPath, pngBuffer);
  console.log(`Wrote ${outPath} (${width}x${Math.round((height / 1280) * width || height)})`);
}

svgToPng(heroSvg, 1280, 720, "baldox-guard-hero.png");
svgToPng(iconSvg, 512, 512, "baldox-guard-icon.png");
