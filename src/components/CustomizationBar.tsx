import React, { useState } from 'react';
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
  Layers, 
  Check, 
  PenTool, 
  RotateCcw, 
  Sparkles, 
  Camera, 
  Undo2 
} from 'lucide-react';
import type { StitchOptions, StickerInstance } from '../types/photobooth';
import { 
  colorSwatches, 
  filterOptions, 
  patternOptions, 
  stickersList, 
  badgeStylesList, 
  doodleBrushes 
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
  onAddCustomTextSticker,
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
}) => {
  const [customText, setCustomText] = useState('');
  const [customTextStyle, setCustomTextStyle] = useState('badge-cute');

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
        <div className="px-3 py-2 bg-cream-50 border-2 border-cream-900 rounded-xl font-bold text-xs uppercase text-cream-900">
          {getLayoutLabel(options.layout)}
        </div>
      </div>

      {/* Purikura Neon Doodle Pen Tool */}
      <div className="flex flex-col gap-3 border-t-2 border-cream-100 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider text-cream-900 flex items-center gap-1.5">
            <PenTool className="w-4 h-4 text-pastelpink-500" />
            Purikura Neon Brush
          </span>
          <button
            type="button"
            onClick={onToggleDoodle}
            className={`px-3 py-1.5 border-2 border-cream-900 rounded-xl text-xs font-bold uppercase transition-all shadow-neo-sm hover:translate-y-[1px] cursor-pointer flex items-center gap-1.5 ${
              doodleActive
                ? 'bg-pastelpink-300 text-cream-900 ring-2 ring-pink-400 shadow-none'
                : 'bg-cream-50 hover:bg-cream-100 text-cream-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {doodleActive ? 'Drawing Active' : 'Enable Pen'}
          </button>
        </div>

        {doodleActive && (
          <div className="p-3 bg-cream-50 border-2 border-cream-900 rounded-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-cream-500 uppercase">Neon Palette</span>
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-cream-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={doodleGlow}
                  onChange={onToggleDoodleGlow}
                  className="w-3.5 h-3.5 accent-pink-500 rounded"
                />
                Glow Effect
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {doodleBrushes.map((brush) => (
                <button
                  key={brush.id}
                  type="button"
                  onClick={() => onChangeDoodleColor(brush.color)}
                  style={{ backgroundColor: brush.color }}
                  title={brush.name}
                  className={`w-7 h-7 rounded-full border-2 border-cream-900 shadow-neo-sm transition-transform cursor-pointer ${
                    doodleColor === brush.color ? 'scale-120 ring-3 ring-pink-500' : 'hover:scale-105'
                  }`}
                />
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase text-cream-600">
                <span>Brush Size</span>
                <span>{doodleSize}px</span>
              </div>
              <input
                type="range"
                min="2"
                max="16"
                step="1"
                value={doodleSize}
                onChange={(e) => onChangeDoodleSize(parseInt(e.target.value))}
                className="w-full accent-cream-900 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {hasDoodles && (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onUndoDoodle}
                  className="flex-1 py-1.5 bg-white hover:bg-cream-100 border-2 border-cream-900 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Undo
                </button>
                <button
                  type="button"
                  onClick={onClearDoodles}
                  className="flex-1 py-1.5 bg-white hover:bg-red-50 text-red-500 border-2 border-red-400 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Pen
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Frame Design Section */}
      {!isTraditional && (
        <div className="flex flex-col gap-3 border-t-2 border-cream-100 pt-3">
          <span className="text-sm font-bold uppercase tracking-wider text-cream-600 flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            Frame Design
          </span>
          
          <div className="flex flex-wrap gap-2">
            {patternOptions.map((pat) => (
              <button
                key={pat.id}
                onClick={() => updateOption('pattern', pat.id)}
                className={`px-3 py-1.5 border-2 border-cream-900 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none cursor-pointer ${
                  options.pattern === pat.id
                    ? 'bg-cream-900 text-white shadow-none translate-x-[1px] translate-y-[1px]'
                    : 'bg-cream-50 hover:bg-cream-100'
                }`}
              >
                {pat.name}
              </button>
            ))}
          </div>

          {showColorPicker && (
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-[10px] font-mono uppercase text-cream-400">Base Frame Color</span>
              <div className="flex flex-wrap gap-2.5">
                {colorSwatches.map((swatch) => (
                  <button
                    key={swatch.value}
                    onClick={() => updateOption('backgroundColor', swatch.value)}
                    title={swatch.name}
                    className={`w-8 h-8 rounded-full border-2 border-cream-900 shadow-neo-sm transition-all hover:scale-105 cursor-pointer ${swatch.class} ${
                      options.backgroundColor.toLowerCase() === swatch.value.toLowerCase()
                        ? 'ring-4 ring-pastelpink-300 scale-105'
                        : ''
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Photo Effects Section */}
      <div className="flex flex-col gap-2 border-t-2 border-cream-100 pt-3">
        <span className="text-sm font-bold uppercase tracking-wider text-cream-600">Photo Effects</span>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((filter) => (
            <button
              key={filter.id}
              onClick={() => updateOption('filter', filter.id)}
              className={`px-3 py-1.5 border-2 border-cream-900 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none cursor-pointer ${
                options.filter === filter.id
                  ? 'bg-cream-900 text-white shadow-none translate-x-[1px] translate-y-[1px]'
                  : 'bg-cream-50 hover:bg-cream-100'
              }`}
            >
              {filter.name}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Sliders if Custom Filter selected */}
      {options.filter === 'custom' && (
        <div className="flex flex-col gap-3 p-3 bg-cream-50/50 border-2 border-cream-900 rounded-xl">
          <span className="text-xs font-mono uppercase tracking-widest text-cream-500">Custom Filter Sliders</span>
          
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-cream-600">
              <span className="text-red-500 font-bold">Red Tint</span>
              <span>{options.customR ?? 0}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={options.customR ?? 0}
              onChange={(e) => updateOption('customR', parseInt(e.target.value))}
              className="w-full accent-red-500 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-cream-600">
              <span className="text-green-600 font-bold">Green Tint</span>
              <span>{options.customG ?? 0}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={options.customG ?? 0}
              onChange={(e) => updateOption('customG', parseInt(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-cream-600">
              <span className="text-blue-500 font-bold">Blue Tint</span>
              <span>{options.customB ?? 0}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={options.customB ?? 0}
              onChange={(e) => updateOption('customB', parseInt(e.target.value))}
              className="w-full accent-blue-500 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-cream-600">
              <span className="text-cream-950 font-bold">Brightness & Glow</span>
              <span>{options.customBrightness ?? 0}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={options.customBrightness ?? 0}
              onChange={(e) => updateOption('customBrightness', parseInt(e.target.value))}
              className="w-full accent-cream-900 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Lens & Glitch Filters */}
      <div className="flex flex-col gap-3 border-t-2 border-cream-100 pt-3">
        <span className="text-sm font-bold uppercase tracking-wider text-cream-900 flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-pastelpink-500" />
          Lens & Glitch Filters
        </span>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase text-cream-600">
            <span>Film Grain / Noise</span>
            <span>{options.grainStrength}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="60"
            value={options.grainStrength || 0}
            onChange={(e) => updateOption('grainStrength', parseInt(e.target.value))}
            className="w-full accent-cream-900 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase text-cream-600">
            <span>3D Chromatic Offset</span>
            <span>{options.chromaticOffset || 0}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            value={options.chromaticOffset || 0}
            onChange={(e) => updateOption('chromaticOffset', parseInt(e.target.value))}
            className="w-full accent-cream-900 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <label className="flex items-center justify-between cursor-pointer group mt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cream-950">Stamp VHS Camcorder HUD</span>
          </div>
          <input
            type="checkbox"
            checked={!!options.vhsOverlay}
            onChange={(e) => updateOption('vhsOverlay', e.target.checked)}
            className="w-4 h-4 border-2 border-cream-900 rounded focus:ring-0 text-cream-900 accent-cream-900 cursor-pointer"
          />
        </label>
      </div>

      {/* Text Sticker Creator */}
      <div className="flex flex-col gap-3 border-t-2 border-cream-100 pt-3">
        <span className="text-sm font-bold uppercase tracking-wider text-cream-900 flex items-center gap-1.5">
          <Type className="w-4 h-4 text-pastelpink-500" />
          Create Text Sticker
        </span>
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="TYPE STICKER TEXT..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (customText.trim()) {
                    onAddCustomTextSticker(customText, customTextStyle);
                    setCustomText('');
                  }
                }
              }}
              maxLength={15}
              className="flex-1 px-3 py-2 border-2 border-cream-900 rounded-xl text-xs uppercase font-mono tracking-wider focus:outline-none focus:border-pink-500"
            />
            <button
              type="button"
              onClick={() => {
                if (customText.trim()) {
                  onAddCustomTextSticker(customText, customTextStyle);
                  setCustomText('');
                }
              }}
              disabled={!customText.trim()}
              className="px-4 py-2 bg-cream-900 text-white font-bold text-xs uppercase rounded-xl border-2 border-cream-900 hover:bg-cream-800 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              Add
            </button>
          </div>
          
          <div className="flex gap-2 justify-between items-center bg-cream-50 p-2 border border-cream-200 rounded-xl">
            <span className="text-[10px] font-mono text-cream-400 uppercase">Style:</span>
            <div className="flex gap-1.5">
              {badgeStylesList.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setCustomTextStyle(st.id)}
                  style={{ backgroundColor: st.bg }}
                  className={`w-5 h-5 rounded-full border border-black shadow-neo-sm relative flex items-center justify-center cursor-pointer`}
                >
                  {customTextStyle === st.id && (
                    <Check className="w-3 h-3 text-black font-black" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Y2K Deco Stickers */}
      <div className="flex flex-col gap-2 border-t-2 border-cream-100 pt-3">
        <span className="text-sm font-bold uppercase tracking-wider text-cream-900 flex items-center gap-1.5">
          <Smile className="w-4 h-4 text-pastelpink-500" />
          Y2K Deco Stickers
        </span>

        <div className="grid grid-cols-5 gap-2 mt-1">
          {stickersList.map((sticker) => (
            <button
              key={sticker.id}
              onClick={() => onAddSticker(sticker.id)}
              title={sticker.label}
              className="w-10 h-10 border-2 border-cream-900 rounded-xl bg-cream-50 hover:bg-pastelpink-50 active:translate-y-[1px] flex items-center justify-center text-xl transition-all shadow-neo-sm cursor-pointer"
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
            ✦ Drag it around on the preview strip.<br />
            ✦ Select it to resize or rotate.
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
