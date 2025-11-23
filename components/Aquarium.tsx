
import React, { useRef, useEffect, useState } from 'react';
import { FishType, FishEntity, Particle, RockConfig, Point, BezierSegment } from '../types';

const FISH_COUNT = 5; // Increased to 5 fish
const BUBBLE_COUNT = 15;
const DUST_COUNT = 150; // Suspended particles for Tyndall effect

interface GravelParticle {
  x: number;
  y: number;
  r: number;
  color: string;
}

interface OrganicLayer {
  yBase: number;
  frequency: number;
  amplitude: number;
  phase: number;
  thickness: number;
  alpha: number;
}

interface SoftShadow {
  points: Point[]; // Rendered with curves
  color: string;
}

interface TextureGrain {
  x: number;
  y: number;
  size: number;
}

interface TextureCrack {
  start: Point;
  cp1: Point;
  cp2: Point;
  end: Point;
}

// Extended Rock Config for specific texturing
interface CustomRockConfig extends RockConfig {
  textureType: 'organic' | 'grainy';
  organicLayers?: OrganicLayer[];
  softShadows?: SoftShadow[];
  grains?: TextureGrain[];
  cracks?: TextureCrack[];
}

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
}

interface FoodParticle {
  id: number; // Added ID for tracking
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  settled: boolean;
  eaten: boolean; // Track if eaten
  rotation: number;
}

interface AquariumProps {
  lightsOn: boolean;
}

const Aquarium: React.FC<AquariumProps> = ({ lightsOn }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // Refs to hold mutable animation state
  const fishRef = useRef<FishEntity[]>([]);
  const bubblesRef = useRef<Particle[]>([]);
  const dustRef = useRef<DustParticle[]>([]);
  const rocksRef = useRef<CustomRockConfig[]>([]);
  const gravelRef = useRef<GravelParticle[]>([]);
  const foodRef = useRef<FoodParticle[]>([]); // State for food
  const foodIdCounter = useRef(0);
  const frameIdRef = useRef<number>(0);
  
  // Track prop in ref for animation loop access
  const lightsOnRef = useRef(lightsOn);

  useEffect(() => {
    lightsOnRef.current = lightsOn;
  }, [lightsOn]);

  // Initialize Simulation
  useEffect(() => {
    const initSimulation = (width: number, height: number) => {
      // 1. Init Fish (Small, exquisite, with Pathing state)
      const fish: FishEntity[] = [];
      const types = [FishType.DEMASONI, FishType.YELLOW_LAB, FishType.PEACOCK];
      
      for (let i = 0; i < FISH_COUNT; i++) {
        const type = types[i % types.length];
        
        // Define the specific path requested by user
        // Center Y varies slightly per fish to avoid collisions
        // Adjusted for 5 fish to spread nicely in the middle-upper section (20% to 55% height)
        const centerY = height * 0.2 + (i * (height * 0.35) / FISH_COUNT); 
        const amplitude = 30; // Gentle curve height
        
        // Coordinates based on percentage of width as per request
        const startX = width * 0.1;  // 10
        const midX = width * 0.5;    // 50
        const endX = width * 1.1;    // 110
        
        // Calculate intermediate control points
        // Segment 1: Start -> Mid (Left to Right)
        const s1_p0 = { x: startX, y: centerY };
        const s1_p1 = { x: startX + (midX - startX) * 0.5, y: centerY - amplitude };
        const s1_p2 = { x: midX, y: centerY };

        // Segment 2: Mid -> End (Left to Right)
        const s2_p0 = { x: midX, y: centerY };
        const s2_p1 = { x: midX + (endX - midX) * 0.5, y: centerY + amplitude };
        const s2_p2 = { x: endX, y: centerY };

        // Segment 3: End -> Mid (Right to Left)
        const s3_p0 = { x: endX, y: centerY };
        const s3_p1 = { x: endX - (endX - midX) * 0.5, y: centerY - amplitude };
        const s3_p2 = { x: midX, y: centerY };

        // Segment 4: Mid -> Start (Right to Left)
        const s4_p0 = { x: midX, y: centerY };
        const s4_p1 = { x: midX - (midX - startX) * 0.5, y: centerY + amplitude };
        const s4_p2 = { x: startX, y: centerY };

        const pathSegments: BezierSegment[] = [
          { p0: s1_p0, p1: s1_p1, p2: s1_p2 },
          { p0: s2_p0, p1: s2_p1, p2: s2_p2 },
          { p0: s3_p0, p1: s3_p1, p2: s3_p2 },
          { p0: s4_p0, p1: s4_p1, p2: s4_p2 },
        ];

        // Stagger start positions
        const startSeg = i % 4;
        const initialPos = pathSegments[startSeg].p0;

        fish.push({
          id: i,
          x: initialPos.x,
          y: initialPos.y,
          angle: 0,
          // Reduced Size by ~30% (was 22 + random*4)
          size: 15 + Math.random() * 3,
          type,
          phase: Math.random() * Math.PI * 2,
          pathSegments,
          currentSegment: startSeg,
          segmentStartTime: Date.now() - Math.random() * 2000, // Random offset in segment
          segmentDuration: 8000 + Math.random() * 2000 // Slow, Zen duration per segment
        });
      }
      fishRef.current = fish;

      // 2. Init Bubbles
      const bubbles: Particle[] = [];
      for (let i = 0; i < BUBBLE_COUNT; i++) {
        bubbles.push({
          x: Math.random() * width,
          y: height + Math.random() * 200,
          vx: 0,
          vy: -0.2 - Math.random() * 0.4, // Slower rise
          size: 0.5 + Math.random() * 1.5,
          alpha: 0.1 + Math.random() * 0.3,
          life: Math.random() * 100,
        });
      }
      bubblesRef.current = bubbles;

      // 3. Init Dust (Tyndall Effect Particles)
      const dust: DustParticle[] = [];
      for (let i = 0; i < DUST_COUNT; i++) {
          dust.push({
              x: Math.random() * width,
              y: Math.random() * height,
              vx: (Math.random() - 0.5) * 0.2,
              vy: (Math.random() - 0.5) * 0.2,
              size: Math.random() * 1.5,
              alpha: Math.random() * 0.5,
              phase: Math.random() * Math.PI * 2
          });
      }
      dustRef.current = dust;

      // 4. Init Rocks (Organic, rounded style)
      const rocks: CustomRockConfig[] = [];
      
      // --- Right Rock: The "Rounded Red Mountain" ---
      const rightRockPoints = [
        { x: width * 0.60, y: height * 0.95 },
        { x: width * 0.68, y: height * 0.55 }, // Peak
        { x: width * 0.78, y: height * 0.65 }, // Shoulder
        { x: width * 0.85, y: height * 0.95 },
      ];
      
      const rLayers: OrganicLayer[] = [];
      const rMinY = Math.min(...rightRockPoints.map(p => p.y));
      for (let y = rMinY; y < height; y += 12) {
         rLayers.push({
           yBase: y,
           frequency: 0.02 + Math.random() * 0.01,
           amplitude: 3 + Math.random() * 4,
           phase: Math.random() * Math.PI * 2,
           thickness: 1.5 + Math.random(),
           alpha: 0.2 + Math.random() * 0.2
         });
      }

      const rShadows: SoftShadow[] = [
          {
              color: 'rgba(50, 20, 10, 0.3)',
              points: [
                  {x: width * 0.62, y: height * 0.90},
                  {x: width * 0.66, y: height * 0.65},
                  {x: width * 0.72, y: height * 0.75},
                  {x: width * 0.70, y: height * 0.90}
              ]
          },
          {
              color: 'rgba(30, 10, 5, 0.25)',
              points: [
                  {x: width * 0.75, y: height * 0.70},
                  {x: width * 0.80, y: height * 0.85},
                  {x: width * 0.76, y: height * 0.92}
              ]
          }
      ];

      rocks.push({
        points: rightRockPoints,
        // UPDATED COLOR: Brighter Terracotta / Orange
        color: '#C06C35', // Brighter Terracotta
        highlight: '#FFB870', // Light Orange
        shadow: '#5D2E12', // Deep Brown-Orange
        textureType: 'organic',
        organicLayers: rLayers,
        softShadows: rShadows
      });

      // --- Left Rock: The "Grey Base" ---
      const leftRockPoints = [
        { x: width * 0.15, y: height * 0.95 },
        { x: width * 0.20, y: height * 0.75 },
        { x: width * 0.35, y: height * 0.72 }, // Flat top
        { x: width * 0.45, y: height * 0.65 }, // Slight rise
        { x: width * 0.55, y: height * 0.85 },
        { x: width * 0.52, y: height * 0.95 },
      ];

      const lGrains: TextureGrain[] = [];
      for(let k=0; k<300; k++) {
          lGrains.push({
              x: Math.random() * width, 
              y: Math.random() * height,
              size: Math.random() * 3
          });
      }
      
      const lCracks: TextureCrack[] = [];
      const lMinY = Math.min(...leftRockPoints.map(p => p.y));
      const lMaxY = Math.max(...leftRockPoints.map(p => p.y));
      
      for(let k=0; k<4; k++) {
         const rx = leftRockPoints[0].x + Math.random() * 100;
         const ry = lMinY + Math.random() * (lMaxY - lMinY);
         lCracks.push({
             start: {x: rx, y: ry},
             cp1: {x: rx + 10, y: ry + 10},
             cp2: {x: rx - 10, y: ry + 20},
             end: {x: rx + 5, y: ry + 30}
         });
      }
      
      const lShadows: SoftShadow[] = [
          {
              color: 'rgba(0,0,0,0.2)',
              points: [
                 {x: width * 0.25, y: height * 0.75},
                 {x: width * 0.35, y: height * 0.75},
                 {x: width * 0.30, y: height * 0.85},
              ]
          }
      ];

      rocks.push({
        points: leftRockPoints,
        color: '#696969', 
        highlight: '#A9A9A9', 
        shadow: '#2F4F4F', 
        textureType: 'grainy',
        grains: lGrains,
        cracks: lCracks,
        softShadows: lShadows
      });

      // --- Back Center Small Rock ---
      rocks.push({
        points: [
            { x: width * 0.40, y: height * 0.95 },
            { x: width * 0.45, y: height * 0.80 },
            { x: width * 0.50, y: height * 0.95 },
        ],
        color: '#555555',
        highlight: '#777777',
        shadow: '#222222',
        textureType: 'grainy',
        grains: lGrains
      });

      rocksRef.current = rocks;

      // 5. Init Gravel Bed
      const gravel: GravelParticle[] = [];
      const floorHeight = 50;
      const density = 3;
      
      for (let x = 0; x < width; x += density) {
        const noise = Math.sin(x * 0.015) * 8 + Math.cos(x * 0.05) * 3;
        const localFloor = floorHeight + noise;
        
        for (let y = height - localFloor; y < height; y += density) {
           if (Math.random() > 0.65) continue;
           const r = 1 + Math.random() * 2.5;
           const colors = ['#dcdcdc', '#a9a9a9', '#8b4513', '#d2b48c', '#2f4f4f'];
           const color = colors[Math.floor(Math.random() * colors.length)];
           
           gravel.push({
             x: x + (Math.random() - 0.5) * density,
             y: y + (Math.random() - 0.5) * density,
             r,
             color
           });
        }
      }
      gravelRef.current = gravel;
    };

    const handleResize = () => {
      if (canvasRef.current) {
        const { clientWidth, clientHeight } = canvasRef.current;
        const dpr = window.devicePixelRatio || 1;
        canvasRef.current.width = clientWidth * dpr;
        canvasRef.current.height = clientHeight * dpr;
        
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);

        setDimensions({ width: clientWidth, height: clientHeight });
        initSimulation(clientWidth, clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameIdRef.current);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    foodIdCounter.current += 1;
    // Spawn Food
    foodRef.current.push({
        id: foodIdCounter.current,
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 0.5, // Slight horizontal drift
        vy: 0.5, // Slow initial drop
        // Reduced radius by ~30% (was 3.5)
        radius: 2.5, 
        settled: false,
        eaten: false,
        rotation: Math.random() * Math.PI
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let tick = 0;

    const render = () => {
      tick++;
      const now = Date.now();
      const width = dimensions.width;
      const height = dimensions.height;
      const isLightsOn = lightsOnRef.current;

      // 1. Background
      const bgGradient = ctx.createRadialGradient(width / 2, 0, 0, width / 2, height / 2, height * 1.2);
      if (isLightsOn) {
          bgGradient.addColorStop(0, '#113842'); 
          bgGradient.addColorStop(0.4, '#050e12'); 
          bgGradient.addColorStop(1, '#000000'); 
      } else {
          bgGradient.addColorStop(0, '#050a10');
          bgGradient.addColorStop(1, '#000000');
      }
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // 2. God Rays
      if (isLightsOn) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const rayCount = 5;
        const centerX = width / 2;
        for (let i = 0; i < rayCount; i++) {
          const sway = Math.sin(tick * 0.002 + i * 2) * 10;
          const rayGrad = ctx.createLinearGradient(centerX + sway, 0, centerX + sway * 0.8, height * 0.85);
          rayGrad.addColorStop(0, `rgba(200, 252, 255, ${0.15 + Math.sin(tick * 0.005) * 0.05})`);
          rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          
          ctx.beginPath();
          ctx.moveTo(centerX + sway - 50, 0); 
          ctx.lineTo(centerX + sway + 50, 0);
          ctx.lineTo(centerX + sway * 0.5 + 110, height); 
          ctx.lineTo(centerX + sway * 0.5 - 110, height);
          
          ctx.fillStyle = rayGrad;
          ctx.fill();
        }
        ctx.restore();
      }

      // 3. Dust
      if (isLightsOn) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        dustRef.current.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.phase += 0.05;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.vx += (Math.random() - 0.5) * 0.01;
            p.vy += (Math.random() - 0.5) * 0.01;
            
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            const alpha = Math.abs(Math.sin(p.phase)) * 0.8 * p.alpha;
            ctx.fillStyle = `rgba(180, 250, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
      }

      // 4. Rocks
      rocksRef.current.forEach(rock => drawCustomRock(ctx, rock));

      // 5. Gravel
      ctx.save();
      for (const p of gravelRef.current) {
         ctx.beginPath();
         ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
         ctx.fillStyle = p.color;
         ctx.fill();
      }
      const gravelVignette = ctx.createLinearGradient(0, height - 80, 0, height);
      gravelVignette.addColorStop(0, 'rgba(0,0,0,0)');
      gravelVignette.addColorStop(1, 'rgba(0,0,0,0.9)');
      ctx.fillStyle = gravelVignette;
      ctx.fillRect(0, height - 80, width, 80);
      ctx.restore();
      
      // 6. Food Logic & Render
      // Filter eaten food first to prevent flickering
      foodRef.current = foodRef.current.filter(f => !f.eaten);
      
      ctx.save();
      foodRef.current.forEach(f => {
          if (!f.settled) {
              // Underwater Physics: Gravity + Water Resistance + Drift
              f.vy += 0.02; // Reduced gravity (buoyancy)
              f.vy *= 0.96; // Vertical Drag
              f.vx *= 0.95; // Horizontal Drag
              f.x += f.vx + Math.sin(tick * 0.05 + f.id) * 0.15; // Water drift
              f.y += f.vy;
              
              const noise = Math.sin(f.x * 0.015) * 8 + Math.cos(f.x * 0.05) * 3;
              const floorY = height - (50 + noise);
              
              if (f.y > floorY - f.radius) {
                  f.y = floorY - f.radius;
                  f.vy *= -0.2; // Dampened bounce
                  f.vx *= 0.5; 
                  if (Math.abs(f.vy) < 0.2) f.settled = true;
              }
          }
          
          ctx.translate(f.x, f.y);
          ctx.rotate(f.rotation);
          ctx.fillStyle = '#DAA520'; // Goldenrod
          ctx.beginPath();
          ctx.arc(0, 0, f.radius, 0, Math.PI*2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.beginPath();
          ctx.arc(-1, -1, f.radius * 0.4, 0, Math.PI*2); // Adjusted highlight
          ctx.fill();
          ctx.rotate(-f.rotation);
          ctx.translate(-f.x, -f.y);
      });
      ctx.restore();

      // 7. Fish Logic & Render (Pass food for interaction)
      fishRef.current.forEach(fish => {
        updateFishBehavior(fish, width, height, now, foodRef.current);
        drawRealisticFish(ctx, fish);
      });

      // 8. Caustics
      if (isLightsOn) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay'; 
        ctx.lineWidth = 20;
        const time = tick * 0.01;
        
        for(let i = 0; i < 3; i++) {
            ctx.beginPath();
            const yOffset = i * (height/3);
            ctx.strokeStyle = `rgba(220, 255, 255, ${0.08 + i * 0.02})`; 
            
            for (let x = 0; x < width; x += 20) {
                const y = yOffset + 
                          Math.sin(x * 0.01 + time + i) * 30 + 
                          Math.cos(x * 0.02 - time) * 20;
                if (x===0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        ctx.restore();
      }

      // 9. Bubbles
      bubblesRef.current.forEach(bubble => {
        bubble.y += bubble.vy;
        bubble.x += Math.sin(tick * 0.01 + bubble.x) * 0.2;
        
        if (bubble.y < -10) {
          bubble.y = height + Math.random() * 100;
          bubble.x = Math.random() * width;
          bubble.vy = -0.2 - Math.random() * 0.4;
        }

        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${bubble.alpha})`;
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(bubble.x - bubble.size*0.3, bubble.y - bubble.size*0.3, bubble.size*0.2, 0, Math.PI*2);
        ctx.fill();
      });

      if (!isLightsOn) {
        ctx.fillStyle = 'rgba(0, 5, 10, 0.5)'; 
        ctx.fillRect(0, 0, width, height);
      }

      frameIdRef.current = requestAnimationFrame(render);
    };

    render();
    
    return () => cancelAnimationFrame(frameIdRef.current);

  }, [dimensions]);

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden shadow-2xl border border-zinc-800 cursor-crosshair group">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
      />
      
      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none opacity-0 group-hover:opacity-60 transition-opacity duration-500">
          <span className="text-xs text-cyan-100/50 font-light tracking-widest bg-black/30 px-3 py-1 rounded-full">
              TAP TO FEED
          </span>
      </div>

      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_60px_rgba(0,0,0,0.5)]"></div>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-30"></div>
    </div>
  );
};

// --- Behavior Functions ---

function updateFishBehavior(fish: FishEntity, w: number, h: number, now: number, foods: FoodParticle[]) {
  if (!fish.pathSegments || fish.pathSegments.length === 0) return;

  // 1. Calculate ideal path position (Ghost Position)
  let timeInSegment = now - (fish.segmentStartTime || 0);
  
  if (timeInSegment > (fish.segmentDuration || 8000)) {
    fish.segmentStartTime = now;
    fish.currentSegment = ((fish.currentSegment || 0) + 1) % fish.pathSegments.length;
    timeInSegment = 0;
  }

  const t = timeInSegment / (fish.segmentDuration || 8000);
  const seg = fish.pathSegments[fish.currentSegment || 0];

  const invT = 1 - t;
  const t2 = t * t;
  const invT2 = invT * invT;

  const idealX = invT2 * seg.p0.x + 2 * invT * t * seg.p1.x + t2 * seg.p2.x;
  const idealY = invT2 * seg.p0.y + 2 * invT * t * seg.p1.y + t2 * seg.p2.y;

  // 2. Determine Actual Target
  let targetX = idealX;
  let targetY = idealY;
  let chaseSpeed = 0.05; // Normal path following speed factor

  // Check for nearby food
  let nearestDist = 300; // Detection range
  let targetFood: FoodParticle | null = null;

  for (const food of foods) {
      if (food.eaten) continue;
      const dx = food.x - fish.x;
      const dy = food.y - fish.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
          nearestDist = dist;
          targetFood = food;
      }
  }

  if (targetFood) {
      targetX = targetFood.x;
      targetY = targetFood.y;
      chaseSpeed = 0.08; // Swims faster towards food
      
      // Eat if close enough
      if (nearestDist < 10) {
          targetFood.eaten = true;
      }
  }

  // 3. Move Fish towards Target (Easing / Steering)
  // Instead of teleporting to idealX, we steer towards targetX
  const dx = targetX - fish.x;
  const dy = targetY - fish.y;
  
  // Apply movement
  fish.x += dx * chaseSpeed;
  fish.y += dy * chaseSpeed;

  // 4. Update Angle
  // If moving significantly, face movement direction. Else face path direction.
  let targetAngle = fish.angle;
  const moveDist = Math.sqrt(dx*dx + dy*dy);
  
  if (moveDist > 1) {
       targetAngle = Math.atan2(dy, dx);
  } else {
       // Fallback to path tangent if stationary (rare)
       const pathDx = 2 * invT * (seg.p1.x - seg.p0.x) + 2 * t * (seg.p2.x - seg.p1.x);
       const pathDy = 2 * invT * (seg.p1.y - seg.p0.y) + 2 * t * (seg.p2.y - seg.p1.y);
       targetAngle = Math.atan2(pathDy, pathDx);
  }

  let diff = targetAngle - fish.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  fish.angle += diff * 0.1;

  // Tail animation speed varies with urgency
  fish.phase += targetFood ? 0.4 : 0.27;
}

function drawRealisticFish(ctx: CanvasRenderingContext2D, fish: FishEntity) {
  ctx.save();
  ctx.translate(fish.x, fish.y);
  
  ctx.rotate(fish.angle);
  
  if (Math.abs(fish.angle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }

  const baseScale = fish.size / 20;
  ctx.scale(baseScale, baseScale);

  // 1. Body
  ctx.beginPath();
  ctx.moveTo(14, 0); 
  ctx.bezierCurveTo(10, -12, -5, -12, -18, -4); 
  ctx.lineTo(-18, 4); 
  ctx.bezierCurveTo(-5, 10, 10, 10, 14, 0); 
  ctx.closePath();

  const grad = ctx.createRadialGradient(0, -2, 2, 0, 0, 15);
  if (fish.type === FishType.YELLOW_LAB) {
      grad.addColorStop(0, '#fde047'); 
      grad.addColorStop(1, '#ca8a04'); 
  } else if (fish.type === FishType.DEMASONI) {
      grad.addColorStop(0, '#60a5fa'); 
      grad.addColorStop(1, '#1e3a8a'); 
  } else {
      const pGrad = ctx.createLinearGradient(-15, 0, 15, 0);
      pGrad.addColorStop(0, '#ef4444'); 
      pGrad.addColorStop(0.5, '#fb923c'); 
      pGrad.addColorStop(1, '#3b82f6'); 
      ctx.fillStyle = pGrad;
      ctx.fill();
  }
  
  if (fish.type !== FishType.PEACOCK) {
      ctx.fillStyle = grad;
      ctx.fill();
  }

  // 2. Stripes (Demasoni)
  if (fish.type === FishType.DEMASONI) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#0f172a';
    for (let i = -15; i < 12; i+=5) {
        ctx.beginPath();
        ctx.moveTo(i, -15);
        ctx.lineTo(i+2, -15);
        ctx.lineTo(i, 15);
        ctx.lineTo(i-2, 15);
        ctx.fill();
    }
    ctx.restore();
  }

  // 3. Fins
  ctx.fillStyle = fish.type === FishType.YELLOW_LAB ? 'rgba(253, 224, 71, 0.7)' : 
                  fish.type === FishType.DEMASONI ? 'rgba(59, 130, 246, 0.7)' : 'rgba(248, 113, 113, 0.6)';
  
  // Dorsal
  ctx.beginPath();
  ctx.moveTo(6, -8);
  ctx.quadraticCurveTo(-5, -16, -16, -5);
  ctx.lineTo(-14, -4);
  ctx.fill();
  if (fish.type === FishType.YELLOW_LAB) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(6, -8);
      ctx.quadraticCurveTo(-5, -16, -16, -5);
      ctx.stroke();
  }

  // Pectoral
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(4, 2, 4, 2, Math.PI/4, 0, Math.PI*2);
  ctx.fill();

  // 4. Tail (Animated)
  const wag = Math.sin(fish.phase) * 0.2;
  ctx.save();
  ctx.translate(-18, 0);
  ctx.rotate(wag);
  ctx.beginPath();
  ctx.moveTo(0, -3);
  ctx.lineTo(-8, -7);
  ctx.quadraticCurveTo(-10, 0, -8, 7);
  ctx.lineTo(0, 3);
  ctx.fillStyle = fish.type === FishType.YELLOW_LAB ? 'rgba(253, 224, 71, 0.8)' : 
                  fish.type === FishType.DEMASONI ? 'rgba(30, 58, 138, 0.8)' : 'rgba(239, 68, 68, 0.8)';
  ctx.fill();
  ctx.restore();

  // 5. Eye
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(11, -2, 2.5, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(11, -2, 1, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

function drawCustomRock(ctx: CanvasRenderingContext2D, rock: CustomRockConfig) {
  ctx.save();
  
  // 1. Path & Clip - Rounded with Quadratic Bezier
  ctx.beginPath();
  const len = rock.points.length;
  // Start at the first point
  ctx.moveTo(rock.points[0].x, rock.points[0].y);
  
  // Smoothly curve through intermediate points
  for (let i = 0; i < len; i++) {
     const p = rock.points[i];
     const nextP = rock.points[(i + 1) % len];
     const xc = (p.x + nextP.x) / 2;
     const yc = (p.y + nextP.y) / 2;
     ctx.quadraticCurveTo(p.x, p.y, xc, yc);
  }
  
  ctx.closePath();
  ctx.clip(); 

  // Calculate bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  rock.points.forEach(p => {
      if(p.x < minX) minX = p.x;
      if(p.y < minY) minY = p.y;
      if(p.x > maxX) maxX = p.x;
      if(p.y > maxY) maxY = p.y;
  });

  // Base Gradient
  const grad = ctx.createLinearGradient(minX, minY, maxX, maxY);
  grad.addColorStop(0, rock.highlight);
  grad.addColorStop(0.5, rock.color);
  grad.addColorStop(1, rock.shadow);
  ctx.fillStyle = grad;
  ctx.fill();

  // 2. Texture Layers
  if (rock.textureType === 'organic' && rock.organicLayers) {
      rock.organicLayers.forEach(layer => {
          ctx.beginPath();
          for (let x = minX; x <= maxX; x+=4) {
               const y = layer.yBase + Math.sin(x * layer.frequency + layer.phase) * layer.amplitude;
               if (x === minX) ctx.moveTo(x, y);
               else ctx.lineTo(x, y);
          }
          ctx.lineTo(maxX, maxY);
          ctx.lineTo(minX, maxY);
          ctx.closePath();
          
          ctx.fillStyle = `rgba(0,0,0, ${layer.alpha})`;
          ctx.fill();
      });
  } else if (rock.textureType === 'grainy') {
      if (rock.grains) {
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          rock.grains.forEach(g => {
              ctx.beginPath();
              ctx.arc(g.x, g.y, g.size, 0, Math.PI*2);
              ctx.fill();
          });
      }
      if (rock.cracks) {
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.lineWidth = 1;
          rock.cracks.forEach(c => {
              ctx.beginPath();
              ctx.moveTo(c.start.x, c.start.y);
              ctx.bezierCurveTo(c.cp1.x, c.cp1.y, c.cp2.x, c.cp2.y, c.end.x, c.end.y);
              ctx.stroke();
          });
      }
  }

  // 3. Shadows
  if (rock.softShadows) {
      rock.softShadows.forEach(shadow => {
          ctx.beginPath();
          // Also smooth shadows
          const sLen = shadow.points.length;
           ctx.moveTo(shadow.points[0].x, shadow.points[0].y);
           for (let i = 0; i < sLen; i++) {
               const p = shadow.points[i];
               const nextP = shadow.points[(i + 1) % sLen];
               const xc = (p.x + nextP.x) / 2;
               const yc = (p.y + nextP.y) / 2;
               ctx.quadraticCurveTo(p.x, p.y, xc, yc);
           }
          ctx.closePath();
          ctx.fillStyle = shadow.color;
          ctx.fill();
      });
  }
  
  ctx.restore();
}

export default Aquarium;
