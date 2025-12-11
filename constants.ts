import { IconType } from './types';

// Using high-quality crypto logos
export const CRYPTO_ICONS: Record<IconType, string> = {
  BTC: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png?v=025',
  ETH: 'https://cryptologos.cc/logos/ethereum-eth-logo.png?v=025',
  USDT: 'https://cryptologos.cc/logos/tether-usdt-logo.png?v=025',
  BNB: 'https://cryptologos.cc/logos/bnb-bnb-logo.png?v=025',
  SOL: 'https://cryptologos.cc/logos/solana-sol-logo.png?v=025',
  XRP: 'https://cryptologos.cc/logos/xrp-xrp-logo.png?v=025',
  DOGE: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png?v=025',
  ADA: 'https://cryptologos.cc/logos/cardano-ada-logo.png?v=025',
  AVAX: 'https://cryptologos.cc/logos/avalanche-avax-logo.png?v=025',
  SHIB: 'https://cryptologos.cc/logos/shiba-inu-shib-logo.png?v=025',
  DOT: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png?v=025',
  TRX: 'https://cryptologos.cc/logos/tron-trx-logo.png?v=025',
  LINK: 'https://cryptologos.cc/logos/chainlink-link-logo.png?v=025',
  MATIC: 'https://cryptologos.cc/logos/polygon-matic-logo.png?v=025',
  UNI: 'https://cryptologos.cc/logos/uniswap-uni-logo.png?v=025'
};

// Visual Constants - MUST MATCH Tile.tsx logic
export const TILE_WIDTH = 48; 
export const TILE_HEIGHT = 54; 
export const TILE_Y_STRIDE = 0.9; // Visual compression for stacking effect

export const DOCK_CAPACITY = 7;

export const TOOL_NAMES = {
  shuffle: "打乱重排",
  undo: "撤销一步",
  remove: "移出三个"
};

export const FUNNY_MESSAGES = {
  loss: [
    "归零了！(Rekt)",
    "被套牢了...",
    "再来一把回本！",
    "今天又被币圈支配了",
    "韭菜的自我修养"
  ],
  win: [
    "月球见！(To the Moon)",
    "你是币圈王者！",
    "财富自由就在此刻",
    "牛市回来了！"
  ],
  level1Win: [
    "第一桶金到手！",
    "热身结束，牛市开启！",
    "准备好迎接真正的挑战了吗？"
  ]
};