import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  ChevronLeft, ChevronRight, CheckCircle2, Circle, 
  SkipForward, FastForward, FileText, ArrowLeft,
  Settings, Link as LinkIcon, Clock, Loader2
} from 'lucide-react';
import { Course, Resource } from '../types';
import { PdfViewerModal } from '../components/PdfViewerModal';

export const CoursePlayer: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user, markVideoComplete, apiUrl, token } = useAuth();
  
  // Data State
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  // Derived Content
  const modules = course?.modules || [];
  const flatVideos = modules.flatMap(m => m.videos);
  
  // Playback State
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const currentVideo = flatVideos[currentVideoIndex];
  const [streamUrl, setStreamUrl] = useState<string>('');
  
  // UI State
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); 
  const controlsTimeoutRef = useRef<number | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [volume, setVolume] = useState(1);
  const lastVolumeRef = useRef(1); // Store last volume for unmuting
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  
  // PDF State
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [securePdfUrl, setSecurePdfUrl] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    const fetchCourseContent = async () => {
        if (!courseId) return;
        try {
            const res = await fetch(`${apiUrl}/courses/${courseId}`);
            if (res.ok) {
                const data = await res.json();
                setCourse(data);
            } else {
                navigate('/dashboard');
            }
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };
    fetchCourseContent();
  }, [courseId, apiUrl, navigate]);

  // --- AUTH CHECK ---
  useEffect(() => {
    if (!loading && user && course) {
        if (!user.purchasedCourseIds.includes(course.id) && user.role !== 'admin') {
            alert("You must purchase this course first.");
            navigate(`/branch/${course.branchSlug}`);
        }
    }
  }, [user, course, loading, navigate]);

  // --- CONSTRUCT STREAM URL ---
  useEffect(() => {
    if (!currentVideo?.videoUrl) return;
    
    // Reset state
    setIsPlaying(false);
    setIsBuffering(true);
    setProgress(0);
    setPlaybackRate(1.0);

    if (currentVideo.videoUrl.startsWith('http')) {
        setStreamUrl(currentVideo.videoUrl); // External Link
        setIsBuffering(false);
    } else {
        // Construct Streaming URL with Token
        const url = `${apiUrl}/stream?key=${encodeURIComponent(currentVideo.videoUrl)}&token=${token}`;
        setStreamUrl(url);
    }
  }, [currentVideo, apiUrl, token]);

  // --- FETCH SIGNED URL (PDF) ---
  const handleOpenNotes = async (resource?: Resource) => {
      // Prioritize resource, fallback to legacy notesUrl
      const targetUrl = resource?.url || currentVideo?.notesUrl;
      if (!targetUrl) return;
      
      setPdfTitle(resource?.title || `Notes: ${currentVideo.title}`);
      
      if (targetUrl.startsWith('http')) {
          setSecurePdfUrl(targetUrl);
      } else {
          try {
              const res = await fetch(`${apiUrl}/media/sign?key=${encodeURIComponent(targetUrl)}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
              });
              const data = await res.json();
              setSecurePdfUrl(data.url);
          } catch(e) { console.error("Failed to sign PDF", e); }
      }
      setIsPdfOpen(true);
  };


  // --- PLAYER LOGIC ---

  const togglePlay = useCallback(() => {
      if (!videoRef.current) return;
      if (videoRef.current.paused) {
          videoRef.current.play().catch(e => console.error("Play failed", e));
          setIsPlaying(true);
      } else {
          videoRef.current.pause();
          setIsPlaying(false);
      }
  }, []);

  const handleFullscreen = () => {
      if (!document.fullscreenElement) {
          containerRef.current?.requestFullscreen();
          setIsFullscreen(true);
      } else {
          document.exitFullscreen();
          setIsFullscreen(false);
      }
  };

  const changeSpeed = (rate: number) => {
      if (videoRef.current) videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSpeedMenu(false);
  };

  // Sync state with DOM events
  useEffect(() => {
      const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', handleFsChange);
      return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
          
          switch(e.code) {
              case 'Space':
                  e.preventDefault();
                  togglePlay();
                  break;
              case 'KeyF':
                  e.preventDefault();
                  handleFullscreen();
                  break;
              case 'ArrowRight':
                  if (videoRef.current) videoRef.current.currentTime += 5;
                  break;
              case 'ArrowLeft':
                  if (videoRef.current) videoRef.current.currentTime -= 5;
                  break;
              case 'KeyM':
                  if(videoRef.current) {
                      if (volume > 0) {
                          lastVolumeRef.current = volume;
                          videoRef.current.volume = 0;
                          setVolume(0);
                      } else {
                          const prev = lastVolumeRef.current || 1;
                          videoRef.current.volume = prev;
                          setVolume(prev);
                      }
                  }
                  break;
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, volume]);

  // Auto-hide Controls
  const interact = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (isPlaying) {
          controlsTimeoutRef.current = window.setTimeout(() => {
              if(!showSpeedMenu) setShowControls(false);
          }, 2500);
      }
  };

  const handleTimeUpdate = () => {
      if (videoRef.current) {
          setCurrentTime(videoRef.current.currentTime);
          setDuration(videoRef.current.duration || 0);
          setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
      }
  };

  const formatTime = (time: number) => {
      if(!time || isNaN(time)) return "0:00";
      const mins = Math.floor(time / 60);
      const secs = Math.floor(time % 60);
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const completedCount = user?.courseProgress?.[courseId || '']?.length || 0;
  const courseCompletion = flatVideos.length > 0 ? Math.round((completedCount / flatVideos.length) * 100) : 0;

  if (loading || !course) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><Loader2 className="animate-spin mr-3" /> Loading Class...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Nav */}
      <div className="bg-white border-b border-gray-200 h-16 px-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
              <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                  <ArrowLeft size={20} />
              </button>
              <div>
                  <h1 className="font-bold text-gray-900 text-sm md:text-base line-clamp-1">{course.title}</h1>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded font-medium">{courseCompletion}% Complete</span>
                  </div>
              </div>
          </div>
      </div>

      <div className="flex-1 max-w-[1600px] w-full mx-auto p-0 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-0 md:gap-6 items-start">
          
          {/* LEFT: Main Player Area */}
          <div className="lg:col-span-2 space-y-4">
              
              {/* VIDEO CONTAINER */}
              <div 
                ref={containerRef}
                className="group relative bg-black aspect-video rounded-none md:rounded-2xl overflow-hidden shadow-xl select-none"
                onMouseMove={interact}
                onMouseLeave={() => isPlaying && setShowControls(false)}
                onClick={togglePlay}
                onDoubleClick={(e) => { e.preventDefault(); handleFullscreen(); }}
              >
                  {streamUrl ? (
                      <video
                        ref={videoRef}
                        src={streamUrl}
                        className="w-full h-full object-contain"
                        onTimeUpdate={handleTimeUpdate}
                        onWaiting={() => setIsBuffering(true)}
                        onCanPlay={() => setIsBuffering(false)}
                        onEnded={() => { setIsPlaying(false); markVideoComplete(courseId!, currentVideo.id); }}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        preload="auto"
                      />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/50">
                          <p className="text-sm">Initializing Stream...</p>
                      </div>
                  )}

                  {/* LOADING SPINNER */}
                  {isBuffering && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                          <Loader2 className="text-white animate-spin" size={48} />
                      </div>
                  )}

                  {/* CONTROLS OVERLAY */}
                  <div 
                    className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 transition-opacity duration-300 flex flex-col justify-end p-4 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 cursor-none'}`}
                    onClick={(e) => e.stopPropagation()} 
                  >
                      {/* Center Play Button (Fixed) */}
                      {!isPlaying && !isBuffering && (
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                              <button 
                                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                className="bg-white/20 backdrop-blur-md p-5 rounded-full text-white hover:bg-white/30 transition-colors shadow-xl ring-1 ring-white/50 cursor-pointer pointer-events-auto"
                              >
                                  <Play size={40} fill="currentColor" className="ml-1" />
                              </button>
                          </div>
                      )}

                      {/* Timeline */}
                      <div className="mb-4 group/timeline relative h-2 bg-white/20 rounded-full cursor-pointer touch-none z-30"
                           onClick={(e) => {
                                if(!videoRef.current) return;
                                const rect = e.currentTarget.getBoundingClientRect();
                                const pos = (e.clientX - rect.left) / rect.width;
                                videoRef.current.currentTime = pos * videoRef.current.duration;
                           }}>
                           <div className="absolute top-0 left-0 h-full bg-brand-500 rounded-full" style={{ width: `${progress}%` }}>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-brand-500 rounded-full scale-0 group-hover/timeline:scale-100 transition-transform shadow-lg border-2 border-white" />
                           </div>
                      </div>

                      {/* Controls Row */}
                      <div className="flex items-center justify-between text-white z-30">
                          <div className="flex items-center gap-6">
                              <button onClick={togglePlay} className="hover:text-brand-400 transition-colors">
                                  {isPlaying ? <Pause size={28} fill="currentColor"/> : <Play size={28} fill="currentColor"/>}
                              </button>
                              
                              <div className="flex items-center gap-3">
                                  <button onClick={() => {
                                      if (volume > 0) {
                                          lastVolumeRef.current = volume;
                                          if (videoRef.current) videoRef.current.volume = 0;
                                          setVolume(0);
                                      } else {
                                          const prev = lastVolumeRef.current || 1;
                                          if (videoRef.current) videoRef.current.volume = prev;
                                          setVolume(prev);
                                      }
                                  }}>
                                      {volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                                  </button>
                                  <input 
                                    type="range" min="0" max="1" step="0.1" value={volume} 
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        setVolume(v);
                                        if(videoRef.current) videoRef.current.volume = v;
                                    }}
                                    className="w-24 h-1 accent-white bg-white/30 rounded-full cursor-pointer"
                                  />
                              </div>

                              <span className="text-sm font-medium opacity-90">
                                  {formatTime(currentTime)} / {formatTime(duration)}
                              </span>
                          </div>

                          <div className="flex items-center gap-4">
                              {/* Speed Menu */}
                              <div className="relative">
                                  <button 
                                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                                    className="text-sm font-bold hover:bg-white/20 px-2 py-1 rounded transition-colors"
                                  >
                                      {playbackRate}x
                                  </button>
                                  {showSpeedMenu && (
                                      <div className="absolute bottom-full right-0 mb-2 bg-black/90 text-white rounded-lg p-1 min-w-[100px] shadow-xl border border-white/10 overflow-hidden">
                                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
                                              <button
                                                key={r}
                                                onClick={() => changeSpeed(r)}
                                                className={`block w-full text-left px-3 py-2 text-sm hover:bg-white/20 ${playbackRate === r ? 'text-brand-400 font-bold' : ''}`}
                                              >
                                                  {r}x
                                              </button>
                                          ))}
                                      </div>
                                  )}
                              </div>

                              <button onClick={handleFullscreen} className="hover:text-brand-400 transition-colors">
                                  {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                              </button>
                          </div>
                      </div>
                  </div>
              </div>

              {/* RESOURCES & NOTES */}
              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                  <div className="mb-4">
                      <h2 className="text-xl font-bold text-gray-900">{currentVideo.title}</h2>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{currentVideo.description || 'No description provided.'}</p>
                  </div>
                  
                  {/* Resources List */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Lesson Resources</h3>
                      
                      {/* New Resources Array */}
                      {currentVideo.resources?.map((res, idx) => (
                           <button 
                                key={idx}
                                onClick={() => handleOpenNotes(res)}
                                className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-brand-50 border border-gray-100 hover:border-brand-200 transition-all group"
                           >
                                <div className="flex items-center gap-3">
                                    <div className="bg-white p-2 rounded shadow-sm text-red-500">
                                        <FileText size={18} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 group-hover:text-brand-700">{res.title}</span>
                                </div>
                                <span className="text-xs text-brand-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">View PDF</span>
                           </button>
                      ))}

                      {/* Legacy Note Support */}
                      {(!currentVideo.resources?.length && currentVideo.notesUrl) && (
                           <button 
                                onClick={() => handleOpenNotes()}
                                className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-brand-50 border border-gray-100 hover:border-brand-200 transition-all group"
                           >
                                <div className="flex items-center gap-3">
                                    <div className="bg-white p-2 rounded shadow-sm text-red-500">
                                        <FileText size={18} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 group-hover:text-brand-700">Lesson Notes</span>
                                </div>
                                <span className="text-xs text-brand-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">View PDF</span>
                           </button>
                      )}

                      {!currentVideo.resources?.length && !currentVideo.notesUrl && (
                          <div className="text-sm text-gray-400 italic">No downloadable resources for this lesson.</div>
                      )}
                  </div>
              </div>
          </div>

          {/* RIGHT: Playlist */}
          <div className="lg:col-span-1 bg-white md:rounded-xl border-y md:border border-gray-200 overflow-hidden flex flex-col h-[600px] sticky top-20">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900">Course Content</h3>
                  <span className="text-xs text-gray-500">{completedCount}/{flatVideos.length} Done</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {modules.map((module, mIdx) => (
                      <div key={mIdx}>
                          <div className="bg-gray-100/80 backdrop-blur px-4 py-2 text-xs font-bold text-gray-600 uppercase tracking-wider sticky top-0 z-10 border-y border-gray-200">
                              {module.title}
                          </div>
                          <div>
                              {module.videos.map(vid => {
                                  const isActive = vid.id === currentVideo.id;
                                  const isDone = user?.courseProgress?.[courseId]?.includes(vid.id);
                                  
                                  return (
                                      <div 
                                        key={vid.id}
                                        onClick={() => {
                                            const idx = flatVideos.findIndex(v => v.id === vid.id);
                                            setCurrentVideoIndex(idx);
                                        }}
                                        className={`flex gap-3 p-4 border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50 ${isActive ? 'bg-brand-50 border-l-4 border-l-brand-500' : 'border-l-4 border-l-transparent'}`}
                                      >
                                          <div className="mt-1">
                                              {isActive ? (
                                                  <div className="text-brand-600"><Play size={16} fill="currentColor" /></div>
                                              ) : isDone ? (
                                                  <div className="text-green-500"><CheckCircle2 size={16} /></div>
                                              ) : (
                                                  <div className="text-gray-300"><Circle size={16} /></div>
                                              )}
                                          </div>
                                          <div className="flex-1">
                                              <p className={`text-sm font-medium line-clamp-2 ${isActive ? 'text-brand-900' : 'text-gray-700'}`}>{vid.title}</p>
                                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                                  <span className="flex items-center gap-1"><Clock size={10} /> {vid.duration}</span>
                                                  {(vid.resources?.length || vid.notesUrl) && <span className="flex items-center gap-1 text-orange-500"><FileText size={10} /> Resources</span>}
                                              </div>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      <PdfViewerModal 
        isOpen={isPdfOpen} 
        onClose={() => setIsPdfOpen(false)} 
        pdfUrl={securePdfUrl}
        title={pdfTitle}
      />
    </div>
  );
};