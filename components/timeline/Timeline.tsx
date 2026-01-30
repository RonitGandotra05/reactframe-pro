import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Track, EditorElement } from '../../types';
import TimelineTrack from './TimelineTrack';
import { ScissorsIcon } from '../ui/Icons';

interface TimelineProps {
  tracks: Track[];
  elements: EditorElement[];
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onSelectElement: (id: string) => void;
  selectedElementId: string | null;
  onUpdateElement: (id: string, updates: Partial<EditorElement>) => void;
  onSplit: () => void;
  pixelsPerSecond: number;
  setPixelsPerSecond: (pps: number) => void;
  onAddAsset?: (assetId: string, trackId: number, startTime: number) => void;
}

type DragMode = 'MOVE' | 'RESIZE_L' | 'RESIZE_R';

const Timeline: React.FC<TimelineProps> = ({
  tracks,
  elements,
  currentTime,
  duration,
  onSeek,
  onSelectElement,
  selectedElementId,
  onUpdateElement,
  onSplit,
  pixelsPerSecond,
  setPixelsPerSecond,
  onAddAsset
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Playhead Drag State
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  
  // Element Drag State
  const [dragState, setDragState] = useState<{
      mode: DragMode;
      elementId: string;
      startX: number;
      originalStartTime: number;
      originalDuration: number;
      originalMediaOffset: number;
      originalTrackId: number;
  } | null>(null);

  // -- Playhead Logic --
  const handleRulerMouseDown = (e: React.MouseEvent) => {
    setIsDraggingPlayhead(true);
    updateTimeFromMouse(e);
  };

  const updateTimeFromMouse = (e: MouseEvent | React.MouseEvent) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 96;
    const newTime = Math.max(0, x / pixelsPerSecond);
    onSeek(newTime);
  };

  // -- Element Interaction Logic --
  const handleElementInteraction = (e: React.MouseEvent, type: DragMode, elementId: string, trackId: number, startTime: number, duration: number, mediaOffset: number) => {
      e.stopPropagation();
      e.preventDefault(); 
      onSelectElement(elementId);
      
      setDragState({
          mode: type,
          elementId,
          startX: e.clientX,
          originalStartTime: startTime,
          originalDuration: duration,
          originalMediaOffset: mediaOffset,
          originalTrackId: trackId
      });
  };

  // Global Mouse Move / Up for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPlayhead) {
        updateTimeFromMouse(e);
      }

      if (dragState) {
          e.preventDefault();
          const deltaX = e.clientX - dragState.startX;
          const deltaTime = deltaX / pixelsPerSecond;
          
          if (dragState.mode === 'MOVE') {
              let newStartTime = Math.max(0, dragState.originalStartTime + deltaTime);
              
              // Determine Track
              const trackElement = (e.target as HTMLElement).closest('[data-track-id]');
              let newTrackId = dragState.originalTrackId;
              if (trackElement) {
                  const id = Number(trackElement.getAttribute('data-track-id'));
                  if (!isNaN(id)) newTrackId = id;
              } else {
                  const elementsUnder = document.elementsFromPoint(e.clientX, e.clientY);
                  const trackDiv = elementsUnder.find(el => el.hasAttribute('data-track-id'));
                  if (trackDiv) {
                       const id = Number(trackDiv.getAttribute('data-track-id'));
                       if (!isNaN(id)) newTrackId = id;
                  }
              }

              onUpdateElement(dragState.elementId, { 
                  startTime: newStartTime,
                  trackId: newTrackId
              });

          } else if (dragState.mode === 'RESIZE_R') {
              // Resize Right Edge: Changes Duration
              const newDuration = Math.max(0.5, dragState.originalDuration + deltaTime);
              onUpdateElement(dragState.elementId, {
                  duration: newDuration
              });

          } else if (dragState.mode === 'RESIZE_L') {
              // Resize Left Edge: Changes StartTime, Duration, and MediaOffset
              // New start time
              let newStartTime = dragState.originalStartTime + deltaTime;
              // Clamp to 0
              if (newStartTime < 0) newStartTime = 0;
              
              // Calculate effective delta after clamping
              const effectiveDelta = newStartTime - dragState.originalStartTime;
              const newDuration = Math.max(0.5, dragState.originalDuration - effectiveDelta);

              // If duration hit min, stop moving start time
              if (newDuration === 0.5) {
                   newStartTime = dragState.originalStartTime + (dragState.originalDuration - 0.5);
              }

              onUpdateElement(dragState.elementId, {
                  startTime: newStartTime,
                  duration: newDuration,
                  mediaOffset: dragState.originalMediaOffset + effectiveDelta 
              });
          }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
      setDragState(null);
    };

    if (isDraggingPlayhead || dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, dragState, pixelsPerSecond, onSeek, onUpdateElement]);


  // -- Library Asset Drop Logic --
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
  };
  
  const handleDrop = (e: React.DragEvent, trackId: number) => {
      e.preventDefault();
      
      const assetId = e.dataTransfer.getData('application/react-frame-asset-id');

      if (assetId && onAddAsset) {
          // Calculate time from drop position relative to the track container
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left - 96;
          const dropTime = Math.max(0, x / pixelsPerSecond);

          onAddAsset(assetId, trackId, dropTime);
      }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const markers = [];
  const totalWidth = Math.max(duration, 60) * pixelsPerSecond + 500;
  for (let i = 0; i < Math.max(duration, 60); i++) {
    markers.push(
      <div key={i} className="absolute top-0 bottom-0 border-l border-gray-300 dark:border-gray-700 text-[10px] text-gray-500 dark:text-gray-500 pl-1 select-none transition-colors" style={{ left: i * pixelsPerSecond }}>
        {i % 5 === 0 ? formatTime(i) : ''}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 select-none transition-colors" ref={containerRef}>
      
      {/* Tools / Header */}
      <div className="h-10 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center px-4 justify-between transition-colors">
        <div className="flex space-x-4 text-xs items-center">
          <span className="font-mono text-blue-600 dark:text-blue-400">{formatTime(currentTime)}</span>
          <div className="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>
          
          <button 
            onClick={onSplit}
            className="flex items-center space-x-1 hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded transition text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
            title="Split Clip at Playhead"
          >
              <ScissorsIcon className="w-4 h-4" />
              <span>Split</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Zoom</span>
            <input 
                type="range" min="10" max="200" 
                value={pixelsPerSecond} 
                onChange={(e) => setPixelsPerSecond(Number(e.target.value))}
                className="w-24 h-1 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
        </div>
      </div>

      <div className="flex-grow relative overflow-x-auto overflow-y-hidden custom-scrollbar">
        <div className="relative min-w-full" style={{ width: `${totalWidth + 96}px` }}>
            
            {/* Ruler */}
            <div 
                ref={rulerRef}
                className="h-8 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 relative cursor-pointer transition-colors"
                onMouseDown={handleRulerMouseDown}
            >
                <div className="w-24 h-full border-r border-gray-200 dark:border-gray-700 absolute left-0 bg-gray-100 dark:bg-gray-800 z-20 transition-colors"></div>
                <div className="absolute left-24 right-0 top-0 bottom-0">{markers}</div>
            </div>

            {/* Tracks */}
            <div className="relative">
                 <div 
                    className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none"
                    style={{ left: `${(currentTime * pixelsPerSecond) + 96}px`, height: '1000px' }} 
                >
                    <div className="w-3 h-3 bg-red-500 transform -translate-x-1/2 -translate-y-1/2 rotate-45 absolute top-0"></div>
                </div>

                {tracks.map(track => (
                    <div 
                        key={track.id} 
                        data-track-id={track.id}
                        onDragOver={handleDragOver} 
                        onDrop={(e) => handleDrop(e, track.id)}
                    >
                        <TimelineTrack
                            track={track}
                            elements={elements}
                            currentTime={currentTime}
                            pixelsPerSecond={pixelsPerSecond}
                            onSelectElement={onSelectElement}
                            selectedElementId={selectedElementId}
                            onUpdateElement={onUpdateElement}
                            onElementInteraction={handleElementInteraction}
                        />
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;