import React from 'react';
import { TileData } from '../types';
import Tile from './Tile';
import { DOCK_CAPACITY } from '../constants';

interface DockProps {
  tiles: TileData[];
}

const Dock: React.FC<DockProps> = ({ tiles }) => {
  // We need to render exactly 7 slots
  const slots = Array.from({ length: DOCK_CAPACITY });

  return (
    <div className="relative mx-auto w-[95%] max-w-md mt-2">
       {/* Wood/Wallet texture background */}
      <div className="h-20 bg-[#3a2d24] rounded-xl border-4 border-[#5c4a3d] shadow-2xl flex items-center justify-center px-2 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-yellow-900 to-transparent"></div>
        
        <div className="flex items-center justify-center w-full gap-1 z-10">
          {tiles.map((tile, index) => (
             <Tile 
              key={`${tile.id}_dock_${index}`} 
              data={tile} 
              onClick={() => {}} 
              inDock={true} 
            />
          ))}
          {/* Empty slots placeholders */}
          {slots.slice(tiles.length).map((_, i) => (
            <div key={`empty-${i}`} className="w-[44px] h-[48px] rounded-lg bg-black/20 mx-[2px] border-2 border-white/5"></div>
          ))}
        </div>
      </div>
      
      {/* Warning if close to full */}
      {tiles.length >= 5 && (
        <div className="absolute -top-10 w-full text-center animate-bounce text-red-500 font-bold drop-shadow-md text-stroke bg-white/80 rounded-full py-0.5 shadow-sm text-sm">
          {tiles.length === 6 ? "要爆仓了！(Danger)" : "注意仓位！"}
        </div>
      )}
    </div>
  );
};

export default Dock;