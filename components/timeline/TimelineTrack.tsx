import React from 'react';
import { EditorElement, Track } from '../../types';

interface TimelineTrackProps {
  track: Track;
  elements: EditorElement[];
  currentTime: number;
  pixelsPerSecond: number;
  onSelectElement: (id: string) => void;
  selectedElementId: string | null;
  onUpdateElement: (id: string, updates: Partial<EditorElement>) => void;
  onElementInteraction: (e: React.MouseEvent, type: 'MOVE' | 'RESIZE_L' | 'RESIZE_R', elementId: string, trackId: number, startTime: number, duration: number, mediaOffset: number) => void;
}

const TimelineTrack: React.FC<TimelineTrackProps> = ({
  track,
  elements,
  pixelsPerSecond,
  onSelectElement,
  selectedElementId,
  onUpdateElement,
  onElementInteraction
}) => {
  return (
    <div className="flex h-12 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 relative group transition-colors">
      {/* Track Header (Left) */}
      <div className="w-24 flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex items-center px-2 text-xs text-gray-500 dark:text-gray-400 z-10 select-none transition-colors">
        {track.name}
      </div>

      {/* Track Content (Timeline) */}
      <div className="flex-grow relative h-full overflow-hidden">
        {elements.filter(el => el.trackId === track.id).map((el) => {
          const left = el.startTime * pixelsPerSecond;
          const width = el.duration * pixelsPerSecond;
          const isSelected = selectedElementId === el.id;

          return (
            <div
              key={el.id}
              className={`absolute top-1 bottom-1 rounded-sm cursor-grab active:cursor-grabbing select-none overflow-hidden text-xs flex items-center px-2 whitespace-nowrap transition-colors
                ${isSelected 
                  ? 'bg-blue-500 border border-blue-600 z-10 text-white' 
                  : 'bg-blue-100 dark:bg-blue-900/60 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800/80 text-blue-900 dark:text-blue-100'}
              `}
              style={{ left: `${left}px`, width: `${width}px` }}
              onMouseDown={(e) => onElementInteraction(e, 'MOVE', el.id, el.trackId, el.startTime, el.duration, el.mediaOffset)}
            >
              <span className="truncate drop-shadow-sm pointer-events-none">{el.name}</span>
              
              {isSelected && (
                <>
                  <div 
                      className="absolute left-0 top-0 bottom-0 w-2 bg-white/30 hover:bg-white/50 cursor-ew-resize"
                      onMouseDown={(e) => onElementInteraction(e, 'RESIZE_L', el.id, el.trackId, el.startTime, el.duration, el.mediaOffset)}
                  ></div>
                  <div 
                      className="absolute right-0 top-0 bottom-0 w-2 bg-white/30 hover:bg-white/50 cursor-ew-resize"
                      onMouseDown={(e) => onElementInteraction(e, 'RESIZE_R', el.id, el.trackId, el.startTime, el.duration, el.mediaOffset)}
                  ></div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimelineTrack;