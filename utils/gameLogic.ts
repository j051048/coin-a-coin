import { TileData, IconType } from '../types';
import { CRYPTO_ICONS, TILE_WIDTH, TILE_HEIGHT, TILE_Y_STRIDE } from '../constants';

// Helper to shuffle array
const shuffle = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Check if tile A is covered by tile B using EXACT Visual Bounding Box
const isCoveredBy = (under: TileData, over: TileData): boolean => {
  // Must be on a higher layer to cover something below
  if (over.z <= under.z) return false;

  // Calculate visual positions EXACTLY as they appear on screen
  const underX = under.x * TILE_WIDTH;
  const underY = under.y * TILE_HEIGHT * TILE_Y_STRIDE;
  
  const overX = over.x * TILE_WIDTH;
  const overY = over.y * TILE_HEIGHT * TILE_Y_STRIDE;

  // STRICT Collision - No margin.
  const margin = 0; 

  const uLeft = underX + margin;
  const uRight = underX + TILE_WIDTH - margin;
  const uTop = underY + margin;
  const uBottom = underY + TILE_HEIGHT - margin;

  const oLeft = overX + margin;
  const oRight = overX + TILE_WIDTH - margin;
  const oTop = overY + margin;
  const oBottom = overY + TILE_HEIGHT - margin;

  // AABB Intersection Test
  const intersect = (
      uLeft < oRight &&
      uRight > oLeft &&
      uTop < oBottom &&
      uBottom > oTop
  );

  return intersect;
};

export const checkInteractability = (tiles: TileData[]): TileData[] => {
  return tiles.map(tile => {
    // A tile is blocked if ANY tile with higher Z covers it
    const isBlocked = tiles.some(other => other.z > tile.z && isCoveredBy(tile, other));
    return { ...tile, isClickable: !isBlocked };
  });
};

export const generateLevel = (level: number): TileData[] => {
  const iconKeys = Object.keys(CRYPTO_ICONS) as IconType[];
  let pool: IconType[] = [];
  const tiles: TileData[] = [];
  
  // DIFFICULTY ADJUSTMENT
  // Level 1: 24 tiles (8 matches) - Tutorial
  // Level 2: 81 tiles (27 matches) - Formerly 108. Reduced for ~5% win rate.
  let tileCount = level === 1 ? 24 : 81; 
  while (tileCount % 3 !== 0) tileCount++;

  const numTypes = level === 1 ? 6 : 14;
  const activeIcons = iconKeys.slice(0, numTypes); 
  
  const setsNeeded = tileCount / 3;
  for (let i = 0; i < setsNeeded; i++) {
    const icon = activeIcons[i % activeIcons.length];
    pool.push(icon, icon, icon);
  }
  pool = shuffle(pool);

  // Layout Generation
  let poolIndex = 0;
  const gridWidth = 7;
  const gridHeight = 9;
  
  // Center coordinates
  const cx = gridWidth / 2 - 0.5; // 3
  const cy = gridHeight / 2 - 0.5; // 4

  if (level === 1) {
    // Standard Tutorial Layout
    for (let z = 0; z < 3; z++) {
       const count = z === 0 ? 16 : 8; 
       for(let i=0; i<count; i++) {
          if (poolIndex >= pool.length) break;
          const x = 1.5 + (i % 4); 
          const y = 2 + Math.floor(i/4) + (z * 0.5); 
          
          tiles.push({
            id: `l1-${z}-${i}`,
            type: pool[poolIndex++],
            x, y, z, isClickable: true
          });
       }
    }
  } else {
    // LEVEL 2 - RANDOMIZED PATTERNS
    // We choose one of 5 archetypes to vary the visual experience
    const layoutType = Math.floor(Math.random() * 5);
    
    // Layout Configs
    // 0: Classic Pyramid (Center heavy)
    // 1: Twin Towers (Two piles)
    // 2: The Cross (Vertical and Horizontal bars)
    // 3: The Ring (Circular hole in middle)
    // 4: The Chaos (Wide spread random)

    const layers = 12; // Reduced from 18 to make it less deep/punishing

    for (let z = 0; z < layers; z++) {
      if (poolIndex >= pool.length) break;

      // Density Calculation:
      // Base layers are wide, Top layers are narrow.
      // Curve: high -> low
      let density = Math.max(2, Math.floor(12 - z * 0.8));
      
      // Override density for specific patterns if needed
      if (layoutType === 4) density = 8; // Constant scatter

      for (let i = 0; i < density; i++) {
        if (poolIndex >= pool.length) break;

        let x = cx;
        let y = cy;

        switch (layoutType) {
          case 0: // Classic Pyramid
            // Gaussian-like distribution around center
            const spread = Math.max(0.5, 3 - z * 0.3);
            x = cx + (Math.random() - 0.5) * spread * 2.5;
            y = cy + (Math.random() - 0.5) * spread * 2.5;
            break;

          case 1: // Twin Towers
            // Left (2) or Right (5)
            const side = i % 2 === 0 ? -1.5 : 1.5;
            const tSpread = Math.max(0.5, 2 - z * 0.2);
            x = cx + side + (Math.random() - 0.5) * tSpread;
            y = cy + (Math.random() - 0.5) * tSpread * 2;
            break;

          case 2: // The Cross
            if (i % 2 === 0) {
              // Horizontal Bar
              x = cx + (Math.random() - 0.5) * 6;
              y = cy + (Math.random() - 0.5) * 1;
            } else {
              // Vertical Bar
              x = cx + (Math.random() - 0.5) * 1;
              y = cy + (Math.random() - 0.5) * 7;
            }
            break;

          case 3: // The Ring
            // Radius reduces slightly as we go up, forming a cone-ring
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.max(0.5, 2.5 - z * 0.1); 
            x = cx + Math.cos(angle) * radius;
            y = cy + Math.sin(angle) * radius * 1.1; // Stretch Y slightly
            break;

          case 4: // The Chaos / Scattered Piles
            // Pick a random quadrant center
            const qx = Math.random() > 0.5 ? 1.5 : 4.5;
            const qy = Math.random() > 0.5 ? 2 : 6;
            x = qx + (Math.random() - 0.5) * 2;
            y = qy + (Math.random() - 0.5) * 2;
            break;
        }

        // Snap to grid (0.5 granularity for stacking effect)
        x = Math.round(x * 2) / 2;
        y = Math.round(y * 2) / 2;

        // Boundary Checks
        x = Math.max(0.5, Math.min(gridWidth - 1.5, x));
        y = Math.max(1, Math.min(gridHeight - 2, y));

        tiles.push({
          id: `l2-t${layoutType}-z${z}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          type: pool[poolIndex++],
          x, y, z, isClickable: true
        });
      }
    }
  }

  // Handle Overflow: Place any remaining tiles on the very bottom layer (z=0) scattered randomly
  // This ensures we always use exactly the full divisible-by-3 pool
  while (poolIndex < pool.length) {
     const x = Math.floor(Math.random() * gridWidth);
     const y = Math.floor(Math.random() * gridHeight);
     tiles.unshift({
       id: `overflow-${poolIndex}`,
       type: pool[poolIndex++],
       x, y, z: 0, isClickable: true
     });
  }
  
  return checkInteractability(tiles);
};