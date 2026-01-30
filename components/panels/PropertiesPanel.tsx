import React from 'react';
import { EditorElement, ElementType } from '../../types';

interface PropertiesPanelProps {
  element: EditorElement | null;
  onUpdate: (id: string, updates: Partial<EditorElement>) => void;
  onDelete: (id: string) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ element, onUpdate, onDelete }) => {
  if (!element) {
    return (
      <div className="w-[300px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 p-4 text-gray-500 text-sm flex flex-col items-center justify-center h-full transition-colors">
        <span>No element selected</span>
      </div>
    );
  }

  const handleChange = (key: string, value: any) => {
    onUpdate(element.id, { props: { ...element.props, [key]: value } });
  };
  
  const handleGeometryChange = (key: keyof EditorElement, value: number) => {
      onUpdate(element.id, { [key]: value });
  };

  const isMedia = element.type === ElementType.VIDEO || element.type === ElementType.AUDIO;

  return (
    <div className="w-[300px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col h-full overflow-y-auto transition-colors">
      <div className="h-12 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 font-semibold text-sm text-gray-700 dark:text-gray-200">
        Properties
      </div>
      
      <div className="p-4 space-y-6">
        {/* Basic Info */}
        <div className="space-y-2">
            <label className="text-xs text-gray-500 uppercase font-bold">Layer Name</label>
            <input 
                type="text" 
                value={element.name}
                onChange={(e) => onUpdate(element.id, { name: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
        </div>

        {/* Media Controls (Video/Audio) */}
        {isMedia && (
             <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <label className="text-xs text-gray-500 uppercase font-bold">Audio Settings</label>
                <div className="flex items-center space-x-2">
                    <input 
                        type="checkbox" 
                        checked={element.props.isMuted || false}
                        onChange={(e) => handleChange('isMuted', e.target.checked)}
                        className="rounded bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Mute Audio</span>
                </div>
                {!element.props.isMuted && (
                    <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Volume ({Math.round((element.props.volume ?? 1) * 100)}%)</span>
                         <input 
                            type="range" min="0" max="1" step="0.05"
                            value={element.props.volume ?? 1} 
                            onChange={(e) => handleChange('volume', Number(e.target.value))} 
                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer mt-1" 
                        />
                    </div>
                )}
             </div>
        )}

        {/* Geometry (Visual Only) - Now enabled for VIDEO too */}
        {element.type !== ElementType.AUDIO && (
            <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-800">
                <label className="text-xs text-gray-500 uppercase font-bold">Transform</label>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">X (%)</span>
                        <input type="number" value={Math.round(element.x)} onChange={(e) => handleGeometryChange('x', Number(e.target.value))} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs text-gray-900 dark:text-white" />
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Y (%)</span>
                        <input type="number" value={Math.round(element.y)} onChange={(e) => handleGeometryChange('y', Number(e.target.value))} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs text-gray-900 dark:text-white" />
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">W (%)</span>
                        <input type="number" value={Math.round(element.width)} onChange={(e) => handleGeometryChange('width', Number(e.target.value))} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs text-gray-900 dark:text-white" />
                    </div>
                     <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">H (%)</span>
                        <input type="number" value={Math.round(element.height)} onChange={(e) => handleGeometryChange('height', Number(e.target.value))} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs text-gray-900 dark:text-white" />
                    </div>
                </div>
            </div>
        )}

        {/* Visual Styles for Video and Shapes */}
        {(element.type === ElementType.TEXT || element.type === ElementType.SHAPE || element.type === ElementType.AI_GENERATED || element.type === ElementType.VIDEO || element.type === ElementType.IMAGE) && (
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <label className="text-xs text-gray-500 uppercase font-bold">Appearance</label>
                
                {(element.type === ElementType.TEXT || element.type === ElementType.AI_GENERATED) && (
                    <div className="space-y-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Content</span>
                        <textarea 
                            value={element.props.text || ''}
                            onChange={(e) => handleChange('text', e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm text-gray-900 dark:text-white h-20"
                        />
                    </div>
                )}

                {(element.type !== ElementType.IMAGE && element.type !== ElementType.VIDEO) && (
                  <div className="grid grid-cols-2 gap-2">
                      <div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">Text Color</span>
                          <input type="color" value={element.props.color || '#ffffff'} onChange={(e) => handleChange('color', e.target.value)} className="w-full h-8 bg-transparent cursor-pointer" />
                      </div>
                      <div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">Bg Color</span>
                          <input type="color" value={element.props.backgroundColor || '#000000'} onChange={(e) => handleChange('backgroundColor', e.target.value)} className="w-full h-8 bg-transparent cursor-pointer" />
                      </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                   <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Radius</span>
                      <input 
                          type="number" 
                          value={element.props.borderRadius || 0} 
                          onChange={(e) => handleChange('borderRadius', Number(e.target.value))} 
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs text-gray-900 dark:text-white"
                      />
                   </div>
                   <div>
                       <span className="text-xs text-gray-500 dark:text-gray-400">Opacity</span>
                        <input 
                            type="range" min="0" max="1" step="0.1"
                            value={element.props.opacity || 1} 
                            onChange={(e) => handleChange('opacity', Number(e.target.value))} 
                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer mt-2" 
                        />
                   </div>
                </div>
            </div>
        )}
        
        <div className="pt-6 mt-auto">
            <button 
                onClick={() => onDelete(element.id)}
                className="w-full py-2 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 hover:bg-red-200 dark:hover:bg-red-900 rounded text-sm transition"
            >
                Delete Layer
            </button>
        </div>

      </div>
    </div>
  );
};

export default PropertiesPanel;