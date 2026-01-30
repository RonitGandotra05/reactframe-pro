import React, { useState, useEffect, useRef } from 'react';
import { TypeIcon, SquareIcon, UploadIcon, SparklesIcon, VideoIcon, MusicIcon, ImageIcon, PlusIcon, PlayIcon, LayersIcon } from '../ui/Icons';
import { ElementType } from '../../types';
import { generateComponentConfig, generateImage, getStoredApiKey } from '../../services/geminiService';
import { saveAsset, getAssets, deleteAsset, MediaAsset } from '../../utils/db';

interface AssetsPanelProps {
  onAddElement: (type: ElementType, props?: any) => void;
  onUploadMedia: (file: File, type: ElementType) => void; // Legacy prop, we'll intercept this
}

const AssetsPanel: React.FC<AssetsPanelProps> = ({ onAddElement }) => {
  const [activeTab, setActiveTab] = useState<'library' | 'image'>('library');
  const [libraryAssets, setLibraryAssets] = useState<MediaAsset[]>([]);
  
  // Recorder State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<ElementType.VIDEO | ElementType.AUDIO | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  // Generator State
  const [prompt, setPrompt] = useState('');
  const [imgPrompt, setImgPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    refreshLibrary();
  }, []);

  const refreshLibrary = async () => {
    const assets = await getAssets();
    setLibraryAssets(assets);
  };

  // -- Library & Upload Logic --
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: ElementType) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await saveAsset(file, type, file.name);
      await refreshLibrary();
    }
  };

  const handleAddToTimeline = (asset: MediaAsset) => {
    const url = URL.createObjectURL(asset.blob);
    onAddElement(asset.type, { src: url, name: asset.name });
  };

  const handleDragStart = (e: React.DragEvent, asset: MediaAsset) => {
      e.dataTransfer.setData('application/react-frame-asset-id', asset.id);
      e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDeleteAsset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(confirm('Remove from library?')) {
      await deleteAsset(id);
      refreshLibrary();
    }
  };

  // -- Recorder Logic --
  const startRecording = async (type: ElementType.VIDEO | ElementType.AUDIO) => {
    try {
      setRecordingType(type);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: type === ElementType.VIDEO, 
        audio: true 
      });
      
      if (videoPreviewRef.current && type === ElementType.VIDEO) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: type === ElementType.VIDEO ? 'video/webm' : 'audio/webm' });
        // Stop stream tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Save to DB
        const name = `Recording ${new Date().toLocaleTimeString()}`;
        await saveAsset(blob, type, name);
        await refreshLibrary();
        setIsRecording(false);
        setRecordingType(null);
        setRecordingTime(0);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      // Timer
      const interval = setInterval(() => {
          setRecordingTime(t => t + 1);
      }, 1000);
      
      // Cleanup timer on stop (hacky for this simplified scope, ideally use useEffect)
      const originalStop = recorder.stop;
      recorder.stop = () => {
          clearInterval(interval);
          MediaRecorder.prototype.stop.call(recorder);
      };

    } catch (err) {
      console.error("Error accessing media devices:", err);
      alert("Could not access camera/microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // -- Generators --
  const handleComponentGenerate = async () => {
    if (!prompt.trim()) return;
    if (!getStoredApiKey()) {
      alert('Please add your Gemini API key in Settings to use AI generation.');
      return;
    }
    setIsGenerating(true);
    const config = await generateComponentConfig(prompt);
    if (config) {
        onAddElement(ElementType.AI_GENERATED, { ...config.props, name: config.name || 'AI Component' });
    }
    setIsGenerating(false);
  };

  const handleImageGenerate = async () => {
    if (!imgPrompt.trim()) return;
    if (!getStoredApiKey()) {
      alert('Please add your Gemini API key in Settings to use Image Generation.');
      return;
    }
    setIsGenerating(true);
    const base64 = await generateImage(imgPrompt);
    if (base64) {
        onAddElement(ElementType.IMAGE, { src: base64, name: 'Nano Banana Image' });
    }
    setIsGenerating(false);
  };

  return (
    <div className="w-[320px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full transition-colors relative">
      
      {/* Recording Overlay */}
      {isRecording && (
          <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
              <div className="text-white mb-4 text-xl font-mono animate-pulse">
                  REC {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              </div>
              {recordingType === ElementType.VIDEO && (
                  <video ref={videoPreviewRef} className="w-full aspect-video bg-black border border-gray-700 rounded mb-4" muted />
              )}
              {recordingType === ElementType.AUDIO && (
                  <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center animate-pulse mb-4">
                      <MusicIcon className="w-12 h-12 text-blue-400" />
                  </div>
              )}
              <button 
                onClick={stopRecording}
                className="bg-red-600 hover:bg-red-700 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg transition-transform hover:scale-105"
              >
                  <SquareIcon className="w-6 h-6 fill-current" />
              </button>
          </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button onClick={() => setActiveTab('library')} className={`flex-1 py-3 text-xs font-semibold transition-colors ${activeTab === 'library' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>Library</button>
          <button onClick={() => setActiveTab('image')} className={`flex-1 py-3 text-xs font-semibold transition-colors ${activeTab === 'image' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>Image Gen</button>
      </div>
      
      <div className="p-4 space-y-6 overflow-y-auto custom-scrollbar flex-1">
        
        {activeTab === 'library' && (
            <>
                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                     <button onClick={() => startRecording(ElementType.VIDEO)} className="flex flex-col items-center justify-center p-3 bg-gray-100 dark:bg-gray-800 rounded hover:bg-red-50 dark:hover:bg-red-900/20 group border border-transparent hover:border-red-500/30 transition">
                         <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mb-1 group-hover:scale-110 transition">
                             <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                         </div>
                         <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">Rec Video</span>
                     </button>
                     <button onClick={() => startRecording(ElementType.AUDIO)} className="flex flex-col items-center justify-center p-3 bg-gray-100 dark:bg-gray-800 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 group border border-transparent hover:border-blue-500/30 transition">
                         <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-1 group-hover:scale-110 transition">
                             <MusicIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                         </div>
                         <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">Rec Audio</span>
                     </button>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                    <h3 className="text-xs text-gray-500 dark:text-gray-500 uppercase font-bold mb-3 flex justify-between items-center">
                        Resource Manager
                        <label className="cursor-pointer text-blue-500 hover:text-blue-400 text-[10px] flex items-center bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                            <PlusIcon className="w-3 h-3 mr-1" /> Import
                            <input type="file" className="hidden" multiple accept="video/*,audio/*,image/*" onChange={(e) => handleFileUpload(e, ElementType.VIDEO)} />
                        </label>
                    </h3>
                    
                    <div className="space-y-2">
                        {libraryAssets.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-xs italic">
                                Library is empty. <br/>Record or Import media.
                            </div>
                        )}
                        {libraryAssets.map(asset => (
                            <div 
                                key={asset.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, asset)}
                                className="group flex items-center p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-colors cursor-grab active:cursor-grabbing"
                                onClick={() => handleAddToTimeline(asset)}
                            >
                                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-900 rounded flex-shrink-0 flex items-center justify-center mr-3 text-gray-500">
                                    {asset.type === ElementType.VIDEO && <VideoIcon className="w-5 h-5" />}
                                    {asset.type === ElementType.AUDIO && <MusicIcon className="w-5 h-5" />}
                                    {asset.type === ElementType.IMAGE && <ImageIcon className="w-5 h-5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-900 dark:text-gray-200 truncate" title={asset.name}>{asset.name}</p>
                                    <p className="text-[10px] text-gray-500">{new Date(asset.createdAt).toLocaleTimeString()}</p>
                                </div>
                                <button 
                                    onClick={(e) => handleDeleteAsset(asset.id, e)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-500 transition"
                                >
                                    <SquareIcon className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                    <h3 className="text-xs text-gray-500 dark:text-gray-500 uppercase font-bold mb-3">UI Components</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => onAddElement(ElementType.TEXT)} className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                            <TypeIcon className="w-5 h-5 mb-1 text-blue-500 dark:text-blue-400" />
                            <span className="text-xs text-gray-700 dark:text-gray-200">Text</span>
                        </button>
                        <button onClick={() => onAddElement(ElementType.SHAPE)} className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                            <SquareIcon className="w-5 h-5 mb-1 text-green-500 dark:text-green-400" />
                            <span className="text-xs text-gray-700 dark:text-gray-200">Shape</span>
                        </button>
                    </div>
                     <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 transition-colors mt-3">
                        <h4 className="text-[10px] font-bold text-gray-400 mb-1 uppercase">AI Animated Components</h4>
                        <input className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs text-gray-900 dark:text-white mb-2 focus:outline-none focus:border-blue-500" 
                            placeholder="e.g. Ringing Bell Button" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                        
                        <button onClick={handleComponentGenerate} disabled={isGenerating} className="w-full bg-blue-600 hover:bg-blue-500 text-xs py-1 rounded text-white disabled:opacity-50 transition-colors">
                            {isGenerating ? 'Generating...' : 'Create Component'}
                        </button>
                        
                        {isGenerating && (
                            <div className="mt-2 w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 animate-[pulse_1s_ease-in-out_infinite] w-2/3 ml-[-50%]"></div>
                            </div>
                        )}
                    </div>
                </div>
            </>
        )}

        {activeTab === 'image' && (
            <div className="space-y-4">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900 dark:to-purple-900 p-4 rounded-xl border border-indigo-200 dark:border-indigo-700 transition-colors">
                    <h3 className="text-xs text-indigo-700 dark:text-indigo-200 font-bold mb-2 flex items-center"><SparklesIcon className="w-3 h-3 mr-1" /> Nano Banana (Image)</h3>
                    <textarea 
                        className="w-full bg-white/80 dark:bg-black/30 border border-indigo-200 dark:border-indigo-500/30 rounded p-2 text-xs text-gray-900 dark:text-white mb-3 focus:outline-none resize-none"
                        rows={3} placeholder="A cyberpunk dog eating noodles..."
                        value={imgPrompt} onChange={(e) => setImgPrompt(e.target.value)}
                    />
                    <button onClick={handleImageGenerate} disabled={isGenerating} className="w-full py-2 bg-indigo-500 hover:bg-indigo-400 rounded text-xs font-bold text-white transition disabled:opacity-50 shadow-md">
                        {isGenerating ? 'Generating...' : 'Generate Image'}
                    </button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default AssetsPanel;
