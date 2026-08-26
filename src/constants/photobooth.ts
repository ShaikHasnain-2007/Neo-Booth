export const colorSwatches = [
  { name: 'White', value: '#FFFFFF', class: 'bg-white border-cream-200' },
  { name: 'Pitch Black', value: '#18181B', class: 'bg-zinc-900 border-zinc-700' },
  { name: 'Maroon Red', value: '#5C0617', class: 'bg-[#5C0617] border-[#3D020D]' },
  { name: 'Pastel Pink', value: '#FFD6DE', class: 'bg-[#FFD6DE] border-[#FFA3B5]' },
  { name: 'Sage Green', value: '#CFDEC0', class: 'bg-[#CFDEC0] border-[#A3BE91]' },
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

export const virtualBackdropsList = [
  {
    id: 'none' as const,
    name: 'Real Camera',
    preview: '🏠',
    description: 'Natural room background',
    category: 'natural' as const,
  },
  {
    id: 'blur' as const,
    name: 'Studio Blur',
    preview: '🌫️',
    description: 'Cinematic bokeh depth',
    category: 'studio' as const,
  },
  {
    id: 'retro-laser' as const,
    name: '90s Laser Grid',
    preview: '⚡',
    description: 'Iconic school portrait lasers',
    category: 'retro' as const,
  },
  {
    id: 'y2k-bliss' as const,
    name: 'Windows Bliss',
    preview: '🪟',
    description: 'Y2K cyan sky & green hills',
    category: 'retro' as const,
  },
  {
    id: 'cyberpunk-tokyo' as const,
    name: 'Cyber Tokyo',
    preview: '🌆',
    description: 'Neon futuristic night skyline',
    category: 'retro' as const,
  },
  {
    id: 'sakura-blossom' as const,
    name: 'Sakura Garden',
    preview: '🌸',
    description: 'Pastel Japanese blossom',
    category: 'anime' as const,
  },
  {
    id: 'vaporwave-sunset' as const,
    name: 'Vaporwave 80s',
    preview: '🌴',
    description: 'Sunset synthwave horizon',
    category: 'retro' as const,
  },
  {
    id: 'minimal-studio' as const,
    name: 'Minimal Studio',
    preview: '📸',
    description: 'Clean high-key photo studio',
    category: 'studio' as const,
  },
  {
    id: 'purikura-pastel' as const,
    name: 'Kawaii Pastel',
    preview: '💖',
    description: 'Japanese purikura hearts & stars',
    category: 'anime' as const,
  },
  {
    id: 'eraser-transparent' as const,
    name: 'AI Cutout Eraser',
    preview: '🟩',
    description: 'Erase background completely',
    category: 'studio' as const,
  },
];

