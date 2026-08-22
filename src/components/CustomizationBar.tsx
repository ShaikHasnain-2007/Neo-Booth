import React from 'react';
import { 
  Calendar, 
  FlipHorizontal, 
  Eye, 
  Smile, 
  Trash2, 
  Sliders, 
  Volume2, 
  VolumeX, 
  Type, 
  PenTool, 
  RotateCcw, 
  Camera, 
  Undo2,
  Printer
} from 'lucide-react';
import type { StitchOptions, StickerInstance, CaptionFont } from '../types/photobooth';
import { 
  colorSwatches, 
  filterOptions, 
  patternOptions, 
  stickersList, 
  doodleBrushes,
  captionFontsList
} from '../constants/photobooth';

interface CustomizationBarProps {
  options: StitchOptions;
  onChange: (options: StitchOptions) => void;
  stickers: StickerInstance[];
  selectedStickerId: string | null;
  onAddSticker: (type: string) => void;
  onUpdateSticker: (id: string, updates: Partial<StickerInstance>) => void;
  onDeleteSticker: (id: string) => void;
  onClearStickers: () => void;
  onAddCustomTextSticker: (text: string, style: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  // Pose Retake Props
  photos: string[];
  onRetakePose: (index: number) => void;
  // Purikura Doodle Props
  doodleActive: boolean;
  onToggleDoodle: () => void;
  doodleColor: string;
  onChangeDoodleColor: (color: string) => void;
  doodleSize: number;
  onChangeDoodleSize: (size: number) => void;
  doodleGlow: boolean;
  onToggleDoodleGlow: () => void;
  hasDoodles: boolean;
  onUndoDoodle: () => void;
  onClearDoodles: () => void;
  // Thermal print modal trigger
  onOpenThermalModal?: () => void;
}

export const CustomizationBar: React.FC<CustomizationBarProps> = ({
  options,
  onChange,
  stickers,
  selectedStickerId,
  onAddSticker,
  onUpdateSticker,
  onDeleteSticker,
  onClearStickers,
  soundEnabled,
  onToggleSound,
  photos,
  onRetakePose,
  doodleActive,
  onToggleDoodle,
  doodleColor,
  onChangeDoodleColor,
  doodleSize,
  onChangeDoodleSize,
  doodleGlow,
  onToggleDoodleGlow,
  hasDoodles,
  onUndoDoodle,
  onClearDoodles,
  onOpenThermalModal,
}) => {
  const updateOption = <K extends keyof StitchOptions>(key: K, value: StitchOptions[K]) => {
    onChange({
      ...options,
      [key]: value,
    });
  };

  const selectedSticker = stickers.find((s) => s.id === selectedStickerId);
  const isTraditional = options.layout === 'traditional-4';
  const showColorPicker = !isTraditional && options.pattern !== 'hologradient';

  const getLayoutLabel = (layout: string) => {
    switch (layout) {
      case 'vertical-2': return '2-Pose Vertical Strip';
      case 'vertical-3': return '3-Pose Vertical Strip';
      case 'grid-6': return '6-Pose Grid Strip';
      case 'traditional-4': return 'Traditional Filmstrip';
      case 'vertical-4':
      default: return '4-Pose Vertical Strip';
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6 bg-white border-3 border-cream-900 rounded-2xl shadow-neo max-h-[85vh] overflow-y-auto">
      <h3 className="text-xl font-bold uppercase tracking-wider border-b-2 border-cream-100 pb-2 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-pastelpink-500" />
          Customize Strip
        </span>
      </h3>

      {/* Individual Pose Retake Tray */}
      {photos.length > 0 && (
        <div className="flex flex-col gap-2 p-3 bg-cream-50/70 border-2 border-cream-900 rounded-2xl shadow-neo-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cream-900 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-pastelpink-500" />
              Retake Individual Poses
            </span>
            <span className="text-[10px] font-mono text-cream-400 uppercase">
              {photos.length} captured
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((photo, i) => (
              <div key={i} className="relative group flex-shrink-0">
                <img
                  src={photo}
                  alt={`Pose ${i + 1}`}
                  className="w-14 h-11 object-cover rounded-lg border-2 border-cream-900 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => onRetakePose(i)}
                  title={`Retake Pose #${i + 1}`}
                  className="absolute inset-0 bg-cream-900/80 rounded-lg text-white font-bold text-[9px] uppercase flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 mb-0.5" />
                  Retake
                </button>
                <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-bold text-white bg-black/60 px-1 rounded">
                  #{i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Layout Info */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-mono uppercase tracking-widest text-cream-400">Current Layout</span>
        <div className="p-2.5 bg-cream-50 border-2 border-cream-900 rounded-xl font-mono text-xs font-bold text-cream-900 flex items-center justify-between">
          <span>{getLayoutLabel(options.layout)}</span>
          <span className="text-[10px] bg-pastelpink-200 px-1.5 py-0.5 rounded border border-cream-900">
            {isTraditional ? 'Traditional' : `${photos.length} Poses`}
          </span>
        </div>
      </div>

      {/* Frame Patterns */}
      {!isTraditional && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-mono uppercase tracking-widest text-cream-400">Frame Pattern</span>
          <div className="grid grid-cols-3 gap-2">
            {patternOptions.map((pat) => (
              <button
                key={pat.id}
                onClick={() => updateOption('pattern', pat.id)}
                className={`py-2 px-2 text-[10px] font-bold uppercase border-2 border-cream-900 rounded-xl transition-all shadow-neo-sm hover:translate-y-[1px] cursor-pointer ${
                  options.pattern === pat.id
                    ? 'bg-cream-900 text-white shadow-none translate-x-[1px] translate-y-[1px]'
                    : 'bg-white hover:bg-cream-50 text-cream-900'
                }`}
              >
                {pat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Background Frame Color */}
      {showColorPicker && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-mono uppercase tracking-widest text-cream-400">Frame Color</span>
          <div className="flex flex-wrap gap-2">
            {colorSwatches.map((color) => (
              <button
                key={color.value}
                onClick={() => updateOption('backgroundColor', color.value)}
                className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer ${color.class} ${
                  options.backgroundColor === color.value ? 'scale-110 shadow-neo-sm ring-2 ring-cream-900 ring-offset-2' : 'hover:scale-105'
                }`}
                title={color.name}
              />
            ))}
            <label 
              title="Custom Hex Color"
              className="w-8 h-8 rounded-full border-2 border-cream-900 bg-gradient-to-br from-pink-400 via-purple-400 to-cyan-400 flex items-center justify-center cursor-pointer shadow-neo-sm hover:scale-105 transition-transform"
            >
              <input 
                type="color" 
                value={options.backgroundColor} 
                onChange={(e) => updateOption('backgroundColor', e.target.value)}
                className="opacity-0 w-0 h-0 absolute cursor-pointer"
              />
              <span className="text-[10px] font-bold text-white drop-shadow">+</span>
            </label>
          </div>
        </div>
      )}

      {/* Color Filter */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-mono uppercase tracking-widest text-cream-400">Color Grading / Filter</span>
        <div className="grid grid-cols-3 gap-2">
          {filterOptions.map((filter) => (
            <button
              key={filter.id}
              onClick={() => updateOption('filter', filter.id)}
              className={`py-2 px-2 text-[10px] font-bold uppercase border-2 border-cream-900 rounded-xl transition-all shadow-neo-sm hover:translate-y-[1px] cursor-pointer ${
                options.filter === filter.id
                  ? 'bg-cream-900 text-white shadow-none translate-x-[1px] translate-y-[1px]'
                  : 'bg-white hover:bg-cream-50 text-cream-900'
              }`}
            >
              {filter.name}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Mix RGB & Glow Sliders */}
      {options.filter === 'custom' && (
        <div className="p-3 bg-cream-50 border-2 border-cream-900 rounded-xl flex flex-col gap-3">
          <span className="text-xs font-bold uppercase text-cream-900">Custom Mix Adjustments</span>
          
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono uppercase text-cream-600">
              <span>Red Tint</span>
              <span>{options.customR ?? 0}</span>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              value={options.customR ?? 0}
              onChange={(e) => updateOption('customR', parseInt(e.target.value))}
              className="w-full accent-cream-900 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono uppercase text-cream-600">
              <span>Green Tint</span>
              <span>{options.customG ?? 0}</span>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              value={options.customG ?? 0}
              onChange={(e) => updateOption('customG', parseInt(e.target.value))}
              className="w-full accent-cream-900 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono uppercase text-cream-600">
              <span>Blue Tint</span>
              <span>{options.customB ?? 0}</span>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              value={options.customB ?? 0}
              onChange={(e) => updateOption('customB', parseInt(e.target.value))}
              className="w-full accent-cream-900 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono uppercase text-cream-600">
              <span>Y2K High-Gloss Glow</span>
              <span>{options.customBrightness ?? 0}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={options.customBrightness ?? 0}
              onChange={(e) => updateOption('customBrightness', parseInt(e.target.value))}
              className="w-full accent-pastelpink-500 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* ✍️ Custom Retro Typography & Captions */}
      <div className="flex flex-col gap-3 border-t-2 border-cream-100 pt-3">
        <span className="text-sm font-bold uppercase tracking-wider text-cream-900 flex items-center gap-1.5">
          <Type className="w-4 h-4 text-pastelpink-500" />
          Custom Frame Caption & Retro Font
        </span>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. BESTIES 💖, TOKYO '26"
            value={options.captionText || ''}
            onChange={(e) => updateOption('captionText', e.target.value)}
            maxLength={35}
            className="flex-1 px-3 py-2 border-2 border-cream-900 rounded-xl text-xs font-bold font-mono uppercase text-cream-900 bg-cream-50 focus:outline-none focus:bg-white"
          />
          {options.captionText && (
            <button
              onClick={() => updateOption('captionText', '')}
              className="px-2.5 py-1 text-xs font-bold text-red-500 hover:bg-red-50 border-2 border-red-400 rounded-xl cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {options.captionText && (
          <div className="flex flex-col gap-2 p-3 bg-pastelpink-50 border-2 border-cream-900 rounded-xl">
            <span className="text-[10px] font-mono uppercase text-cream-600">Select Typography Style</span>
            <div className="grid grid-cols-2 gap-1.5">
              {captionFontsList.map((f) => (
                <button
                  key={f.id}
                  onClick={() => updateOption('captionFont', f.id as CaptionFont)}
                  className={`p-2 text-[10px] border-2 border-cream-900 rounded-lg text-left transition-all cursor-pointer ${
                    (options.captionFont || 'bubble') === f.id
                      ? 'bg-cream-900 text-white shadow-none'
                      : 'bg-white text-cream-900 shadow-neo-sm hover:translate-y-[1px]'
                  }`}
                >
                  <div className="font-bold">{f.name}</div>
                  <div className="text-[9px] opacity-75 truncate">{f.example}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 🪄 Purikura Neon Brush Drawing Tool */}
      <div className="flex flex-col gap-3 border-t-2 border-cream-100 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider text-cream-900 flex items-center gap-1.5">
            <PenTool className="w-4 h-4 text-pastelpink-500" />
            Purikura Neon Brush
          </span>
          <button
            onClick={onToggleDoodle}
            className={`px-3 py-1 text-xs font-mono font-bold uppercase border-2 border-cream-900 rounded-xl transition-all shadow-neo-sm hover:translate-y-[1px] cursor-pointer ${
              doodleActive ? 'bg-pastelpink-400 text-cream-900' : 'bg-cream-50 hover:bg-cream-100 text-cream-900'
            }`}
          >
            {doodleActive ? '✦ Drawing Mode ON' : 'Draw on Strip'}
          </button>
        </div>

        {doodleActive && (
          <div className="p-3 bg-pastelpink-50 border-2 border-cream-900 rounded-xl flex flex-col gap-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs font-bold uppercase text-cream-900">
              <span>Neon Palette</span>
              <div className="flex gap-1">
                {hasDoodles && (
                  <>
                    <button
                      type="button"
                      onClick={onUndoDoodle}
                      title="Undo last stroke"
                      className="px-2 py-1 bg-white border border-cream-900 rounded text-[10px] flex items-center gap-1 hover:bg-cream-50 cursor-pointer"
                    >
                      <Undo2 className="w-3 h-3" />
                      Undo
                    </button>
                    <button
                      type="button"
                      onClick={onClearDoodles}
                      title="Clear all drawings"
                      className="px-2 py-1 bg-white border border-red-400 text-red-500 rounded text-[10px] flex items-center gap-1 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {doodleBrushes.map((brush) => (
                <button
                  key={brush.id}
                  onClick={() => {
                    onChangeDoodleColor(brush.color);
                    if (brush.glow !== doodleGlow) onToggleDoodleGlow();
                  }}
                  className={`w-7 h-7 rounded-full border-2 border-cream-900 transition-transform cursor-pointer ${
                    doodleColor === brush.color ? 'scale-110 shadow-neo-sm ring-2 ring-cream-900 ring-offset-1' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: brush.color }}
                  title={brush.name}
                />
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-mono uppercase text-cream-600">
                <span>Brush Size</span>
                <span>{doodleSize}px</span>
              </div>
              <input
                type="range"
                min="2"
                max="24"
                value={doodleSize}
                onChange={(e) => onChangeDoodleSize(parseInt(e.target.value))}
                className="w-full accent-pastelpink-500 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Y2K Deco Stickers */}
      <div className="flex flex-col gap-2 border-t-2 border-cream-100 pt-3">
        <span className="text-sm font-bold uppercase tracking-wider text-cream-900 flex items-center gap-1.5">
          <Smile className="w-4 h-4 text-pastelpink-500" />
          Y2K Deco Stickers
        </span>

        <div className="grid grid-cols-7 gap-1.5 mt-1">
          {stickersList.map((sticker) => (
            <button
              key={sticker.id}
              onClick={() => onAddSticker(sticker.id)}
              title={sticker.label}
              className="w-9 h-9 border-2 border-cream-900 rounded-xl bg-cream-50 hover:bg-pastelpink-50 active:translate-y-[1px] flex items-center justify-center text-lg transition-all shadow-neo-sm cursor-pointer"
            >
              {sticker.emoji}
            </button>
          ))}
        </div>

        {selectedSticker ? (
          <div className="mt-2 p-3 bg-pastelpink-50 border-2 border-cream-900 rounded-xl flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase text-cream-900">
              <span className="flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5" />
                Edit Selected
              </span>
              <button
                type="button"
                onClick={() => onDeleteSticker(selectedSticker.id)}
                className="text-red-600 hover:text-red-700 flex items-center gap-0.5 font-bold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase text-cream-600">
                <span>Scale</span>
                <span>{selectedSticker.scale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={selectedSticker.scale}
                onChange={(e) => onUpdateSticker(selectedSticker.id, { scale: parseFloat(e.target.value) })}
                className="w-full accent-cream-900 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase text-cream-600">
                <span>Rotation</span>
                <span>{selectedSticker.rotation}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={selectedSticker.rotation}
                onChange={(e) => onUpdateSticker(selectedSticker.id, { rotation: parseInt(e.target.value) })}
                className="w-full accent-cream-900 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        ) : (
          <p className="text-[10px] font-mono text-cream-400 mt-1 uppercase text-center leading-normal">
            ✦ Click a sticker to place it.<br />
            ✦ Drag it around on the preview strip.
          </p>
        )}

        {stickers.length > 0 && (
          <button
            onClick={onClearStickers}
            className="mt-2 w-full py-2 bg-white border-2 border-red-500 hover:bg-red-50 text-red-500 rounded-xl font-bold uppercase text-xs transition-all shadow-neo-sm hover:translate-y-[1px] cursor-pointer"
          >
            Clear All Stickers
          </button>
        )}
      </div>

      {/* 🖨️ Thermal Printer Preview Shortcut */}
      {onOpenThermalModal && (
        <div className="flex flex-col gap-2 border-t-2 border-cream-100 pt-3">
          <button
            onClick={onOpenThermalModal}
            className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-cream-900 border-2 border-cream-900 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-neo-sm hover:translate-y-[1px] cursor-pointer"
          >
            <Printer className="w-4 h-4 text-cream-900" />
            Thermal Pocket Printer Mode
          </button>
        </div>
      )}

      {/* Footer Controls: Audio, Date, Mirror */}
      <div className="flex flex-col gap-3 border-t-2 border-cream-100 pt-3 mt-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider text-cream-900 flex items-center gap-1.5">
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-cream-400" />}
            Sound Effects (SFX)
          </span>
          <button
            onClick={onToggleSound}
            className={`px-3 py-1 border-2 border-cream-900 rounded-lg text-[10px] font-bold uppercase shadow-neo-sm hover:translate-y-[1px] transition-all cursor-pointer ${
              soundEnabled ? 'bg-pastelpink-200 text-cream-900' : 'bg-cream-100 text-cream-400'
            }`}
          >
            {soundEnabled ? 'On' : 'Muted'}
          </button>
        </div>

        <label className="flex items-center justify-between cursor-pointer group mt-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cream-600 group-hover:text-pastelpink-500 transition-colors" />
            <span className="text-sm font-bold uppercase tracking-wider text-cream-900">Show Date & Time</span>
          </div>
          <input
            type="checkbox"
            checked={options.showDate}
            onChange={(e) => updateOption('showDate', e.target.checked)}
            className="w-4 h-4 border-2 border-cream-900 rounded focus:ring-0 text-cream-900 accent-cream-900 cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer group">
          <div className="flex items-center gap-2">
            <FlipHorizontal className="w-4 h-4 text-cream-600 group-hover:text-pastelpink-500 transition-colors" />
            <span className="text-sm font-bold uppercase tracking-wider text-cream-900">Selfie Mirror Mode</span>
          </div>
          <input
            type="checkbox"
            checked={!!options.isMirrored}
            onChange={(e) => updateOption('isMirrored', e.target.checked)}
            className="w-4 h-4 border-2 border-cream-900 rounded focus:ring-0 text-cream-900 accent-cream-900 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};
