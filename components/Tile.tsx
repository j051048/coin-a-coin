import React from 'react';
import { TileData } from '../types';
import { CRYPTO_ICONS, TILE_WIDTH, TILE_HEIGHT, TILE_Y_STRIDE } from '../constants';

interface TileProps {
  data: TileData;
  onClick: (tile: TileData) => void;
  inDock?: boolean;
}

const Tile: React.FC<TileProps> = ({ data, onClick, inDock = false }) => {
  const isClickable = inDock || data.isClickable;

  // Optimized Visual Style "Nano Banana"
  // Cute, thick 3D look
  
  const baseClasses = `
    absolute transition-all duration-300 ease-out
    flex items-center justify-center
    rounded-xl select-none box-border
    ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}
  `;

  // Visual state styling
  let visualClasses = "";
  if (!isClickable && !inDock) {
      // Darkened "Mask" effect for unclickable tiles
      visualClasses = "bg-gray-200 border-gray-400 brightness-[0.4] z-0";
  } else {
      // Active beautiful tile
      visualClasses = "bg-white border-b-4 border-r-2 border-[#b8c6db] hover:-translate-y-1 hover:brightness-105 active:border-b-0 active:translate-y-1 z-10 shadow-[2px_4px_6px_rgba(0,0,0,0.15)]";
  }
  
  if (inDock) {
      visualClasses = "bg-white border-2 border-gray-200 shadow-sm";
  }

  // Use Constants for Layout to match GameLogic.ts collision detection
  const style: React.CSSProperties = inDock ? {
    width: '44px',
    height: '48px',
    margin: '0 2px',
    position: 'relative',
    transform: 'none'
  } : {
    width: `${TILE_WIDTH}px`,
    height: `${TILE_HEIGHT}px`,
    // Center alignment based on 7-column grid
    left: `calc(50% - ${(3.5 * TILE_WIDTH)}px + ${data.x * TILE_WIDTH}px)`, 
    // Accurate Y positioning with stride
    top: `${data.y * TILE_HEIGHT * TILE_Y_STRIDE}px`, 
    zIndex: data.z * 10 + Math.floor(data.x + data.y), 
  };

  return (
    <div
      onClick={() => isClickable && onClick(data)}
      className={`${baseClasses} ${visualClasses}`}
      style={style}
    >
      <div className="w-9 h-9 flex items-center justify-center bg-gray-50 rounded-full p-1">
        <img 
          src={CRYPTO_ICONS[data.type]} 
          alt={data.type} 
          className="w-full h-full object-contain pointer-events-none drop-shadow-sm" 
          loading="lazy"
        />
      </div>
      
      {/* Glossy highlight for extra "cute/polished" feel */}
      {!inDock && isClickable && (
          <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full opacity-60"></div>
      )}
    </div>
  );
};

export default React.memo(Tile);