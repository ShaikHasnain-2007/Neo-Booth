import type { VirtualBackdrop, CaptionFont } from '../types/photobooth';

export const colorSwatches = [
  { name: 'White', value: '#FFFFFF', class: 'bg-white border-cream-200' },
  { name: 'Pitch Black', value: '#18181B', class: 'bg-zinc-900 border-zinc-700' },
  { name: 'Maroon Red', value: '#5C0617', class: 'bg-[#5C0617] border-[#3D020D]' },
  { name: 'Pastel Pink', value: '#FFD6DE', class: 'bg-[#FFD6DE] border-[#FFA3B5]' },
  { name: 'Sage Green', value: '#CFDEC0', class: 'bg-[#CFDEC0] border-[#A3BE91]' },
  { name: 'Cyber Cyan', value: '#00F0FF', class: 'bg-[#00F0FF] border-[#00B4D8]' },
  { name: 'Butter Yellow', value: '#FEF08A', class: 'bg-[#FEF08A] border-[#FACC15]' },
  { name: 'Lavender', value: '#E9D5FF', class: 'bg-[#E9D5FF] border-[#C084FC]' },
];

export const filterOptions = [
  { id: 'none', name: 'Normal' },
  { id: 'grayscale', name: 'B&W Retro' },
  { id: 'sepia', name: 'Warm Sepia' },
  { id: 'high-contrast', name: 'Noir Contrast' },
  { id: 'vintage', name: 'Y2K Vintage' },
  { id: 'analog-film', name: 'Analog Film' },
  { id: 'custom', name: 'Custom Mix' },
] as const;

export const patternOptions = [
  { id: 'none', name: 'Solid Frame' },
  { id: 'checkerboard', name: 'Checkerboard' },
  { id: 'stars', name: 'Y2K Stars' },
  { id: 'cherries', name: 'Cherries' },
  { id: 'hologradient', name: 'Holo Gradient' },
] as const;

export const stickersList = [
  { id: 'heart', emoji: '💖', label: 'Heart', type: 'emoji' },
  { id: 'star', emoji: '⭐', label: 'Star', type: 'emoji' },
  { id: 'sparkles', emoji: '✨', label: 'Sparkle', type: 'emoji' },
  { id: 'cherry', emoji: '🍒', label: 'Cherry', type: 'emoji' },
  { id: 'sunglasses', emoji: '🕶️', label: 'Shades', type: 'emoji' },
  { id: 'butterfly', emoji: '🦋', label: 'Butterfly', type: 'emoji' },
  { id: 'alien', emoji: '👾', label: 'Alien', type: 'emoji' },
  { id: 'flower', emoji: '🌸', label: 'Flower', type: 'emoji' },
  { id: 'lightning', emoji: '⚡', label: 'Volt', type: 'emoji' },
  { id: 'teddy', emoji: '🧸', label: 'Teddy', type: 'emoji' },
  { id: 'ribbon', emoji: '🎀', label: 'Ribbon', type: 'emoji' },
  { id: 'fire', emoji: '🔥', label: 'Fire', type: 'emoji' },
  { id: 'kiss', emoji: '💋', label: 'Kiss', type: 'emoji' },
  { id: 'crown', emoji: '👑', label: 'Crown', type: 'emoji' },
];

export const badgeStylesList = [
  { id: 'badge-cute', name: 'Cute Pink', bg: '#FFD6DE' },
  { id: 'badge-y2k', name: 'Y2K Cyan', bg: '#00FFCC' },
  { id: 'badge-cool', name: 'Cool Sage', bg: '#CFDEC0' },
  { id: 'badge-baby', name: 'Baby Peach', bg: '#FFE5B4' },
];

export const layoutsList = [
  {
    id: 'vertical-4' as const,
    name: 'Layout A',
    poses: 4,
    description: '4 Pose Strip',
    style: 'vertical',
  },
  {
    id: 'vertical-3' as const,
    name: 'Layout B',
    poses: 3,
    description: '3 Pose Strip',
    style: 'vertical',
  },
  {
    id: 'vertical-2' as const,
    name: 'Layout C',
    poses: 2,
    description: '2 Pose Strip',
    style: 'vertical',
  },
  {
    id: 'grid-6' as const,
    name: 'Layout D',
    poses: 6,
    description: '6 Pose Grid',
    style: 'grid',
  },
  {
    id: 'traditional-4' as const,
    name: 'Traditional',
    poses: 4,
    description: '4 Pose Vertical',
    style: 'traditional',
  },
];

export const doodleBrushes = [
  { id: 'neon-pink', name: 'Neon Pink', color: '#FF2E93', glow: true },
  { id: 'neon-cyan', name: 'Cyber Cyan', color: '#00F0FF', glow: true },
  { id: 'neon-yellow', name: 'Electric Volt', color: '#FAFF00', glow: true },
  { id: 'neon-green', name: 'Acid Green', color: '#39FF14', glow: true },
  { id: 'pure-white', name: 'Pure White', color: '#FFFFFF', glow: true },
  { id: 'pitch-black', name: 'Ink Black', color: '#000000', glow: false },
];

export const virtualBackdropsList: VirtualBackdrop[] = [
  {
    id: 'none',
    name: 'Real Background',
    preview: '🏠',
    type: 'css',
    bgValue: 'transparent',
  },
  {
    id: 'cyberpunk-tokyo',
    name: 'Cyber Tokyo',
    preview: '🌆',
    type: 'gradient',
    bgValue: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  },
  {
    id: 'y2k-bliss',
    name: 'Windows Bliss',
    preview: '🪟',
    type: 'gradient',
    bgValue: 'linear-gradient(180deg, #3a88e9 0%, #70b4ff 50%, #44aa33 50%, #2e8b1e 100%)',
  },
  {
    id: 'retro-laser',
    name: '90s Laser Grid',
    preview: '⚡',
    type: 'gradient',
    bgValue: 'linear-gradient(135deg, #1f005c 0%, #5b0060 25%, #870160 50%, #ac255e 75%, #ca485c 100%)',
  },
  {
    id: 'sakura-blossom',
    name: 'Sakura Pastel',
    preview: '🌸',
    type: 'gradient',
    bgValue: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
  },
  {
    id: 'vaporwave-sunset',
    name: 'Vaporwave',
    preview: '🌴',
    type: 'gradient',
    bgValue: 'linear-gradient(180deg, #ff71ce 0%, #01cdfe 50%, #05ffa1 100%)',
  },
  {
    id: 'minimal-studio',
    name: 'Photo Studio',
    preview: '📸',
    type: 'gradient',
    bgValue: 'radial-gradient(circle at center, #ffffff 0%, #d4d4d8 100%)',
  },
];

export const captionFontsList: { id: CaptionFont; name: string; fontClass: string; example: string }[] = [
  { id: 'matrix', name: 'Digital Matrix', fontClass: 'font-mono tracking-widest uppercase font-black', example: '2026.08.22' },
  { id: 'bubble', name: 'Y2K Bubble', fontClass: 'font-sans font-black tracking-tight uppercase', example: 'BESTIES ✨' },
  { id: 'gothic', name: 'Tokyo Gothic', fontClass: 'font-serif uppercase font-bold tracking-widest', example: 'TOKYO NIGHTS' },
  { id: 'handwritten', name: 'Sharpie Pen', fontClass: 'font-mono italic font-bold tracking-wider', example: 'sweet memories' },
  { id: 'pixel', name: '8-Bit Pixel', fontClass: 'font-mono uppercase font-extrabold tracking-widest', example: 'NEO BOOTH' },
];
