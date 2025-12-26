import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Course } from '../../types';
import { 
  Video, FileText, ChevronRight, Plus, 
  ArrowLeft, Loader2, Trash2, Edit2, AlertCircle, FilePlus
} from 'lucide-react';

export const AdminMedia: React.FC = () => {
  const { courses, refreshData, uploadFile, uploadFiles, deleteVideo, updateVideo } = useData();
  const { token, apiUrl } = useAuth();
  
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeModuleIdx, setActiveModuleIdx] = useState<number | null>(null);
  
  // Modal States
  const [showAddModule, setShowAddModule] = useState(false);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [showEditVideo, setShowEditVideo] = useState(false);
  
  // Forms
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [videoForm, setVideoForm] = useState({ title: '', description: '', duration: '' });
  const [editVideoId, setEditVideoId] = useState<string | null>(null);
  
  // File Uploads
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [noteFiles, setNoteFiles] = useState<File[]>([]); // Multiple notes
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // --- ACTIONS ---

  const handleCreateModule = async () => {
    if (!selectedCourse || !newModuleTitle) return;
    setIsUploading(true);
    try {
        await fetch(`${apiUrl}/courses/${selectedCourse.id}/modules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title: newModuleTitle })
        });
        await refreshData();
        const updated = await fetch(`${apiUrl}/courses/${selectedCourse.id}`).then(r => r.json());
        setSelectedCourse(updated);
        setShowAddModule(false);
        setNewModuleTitle('');
    } catch(e) { alert("Failed to add module"); }
    finally { setIsUploading(false); }
  };

  const handleUploadContent = async () => {
    if (!selectedCourse || activeModuleIdx === null || !videoForm.title || !videoFile) return;
    
    setIsUploading(true);
    try {
        setUploadStatus('Uploading Video (this may take a while)...');
        const videoKey = await uploadFile(videoFile, `videos/${selectedCourse.id}`);
        
        const resources = [];
        if (noteFiles.length > 0) {
            setUploadStatus(`Uploading ${noteFiles.length} note files...`);
            const uploadedNotes = await uploadFiles(noteFiles, `notes/${selectedCourse.id}`);
            uploadedNotes.forEach(note => {
                resources.push({
                    title: note.originalName.replace('.pdf', ''),
                    url: note.key,
                    type: 'pdf'
                });
            });
        }

        setUploadStatus('Saving Metadata...');
        await fetch(`${apiUrl}/courses/${selectedCourse.id}/modules/${activeModuleIdx}/videos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                ...videoForm,
                videoUrl: videoKey,
                resources
            })
        });

        await refreshData();
        const updated = await fetch(`${apiUrl}/courses/${selectedCourse.id}`).then(r => r.json());
        setSelectedCourse(updated);
        
        setShowAddVideo(false);
        setVideoForm({ title: '', description: '', duration: '' });
        setVideoFile(null);
        setNoteFiles([]);

    } catch (e) {
        console.error(e);
        alert("Upload failed. Check console.");
    } finally {
        setIsUploading(false);
        setUploadStatus('');
    }
  };

  const handleDeleteVideo = async (moduleIdx: number, videoId: string) => {
      if (!selectedCourse || !window.confirm("Are you sure? This will delete the video file from R2 permanently.")) return;
      try {
          await deleteVideo(selectedCourse.id, moduleIdx, videoId);
          // Refresh local state
          const updated = await fetch(`${apiUrl}/courses/${selectedCourse.id}`).then(r => r.json());
          setSelectedCourse(updated);
      } catch (e) { alert("Delete failed"); }
  };

  // --- VIEW: COURSE LIST ---
  if (!selectedCourse) {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
            <p className="text-gray-500">Select a course to manage videos and notes.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(course => (
                    <div 
                        key={course.id} 
                        onClick={() => setSelectedCourse(course)}
                        className="bg-white p-6 rounded-xl border border-gray-200 hover:border-brand-500 cursor-pointer transition-all shadow-sm hover:shadow-md group"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <img src={course.thumbnail || 'https://via.placeholder.com/150'} className="w-16 h-10 object-cover rounded bg-gray-100" alt="" />
                            <div>
                                <h3 className="font-bold text-gray-900 line-clamp-1">{course.title}</h3>
                                <p className="text-xs text-gray-500">{course.id}</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-500">
                            <span className="flex items-center gap-1"><Video size={14}/> {course.videoCount || 0} Videos</span>
                            <ChevronRight className="text-gray-300 group-hover:text-brand-500" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  }

  // --- VIEW: CONTENT MANAGER ---
  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <button onClick={() => setSelectedCourse(null)} className="p-2 hover:bg-gray-200 rounded-full">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{selectedCourse.title}</h1>
                <p className="text-gray-500 text-sm">Manage Curriculum</p>
            </div>
        </div>

        {/* Modules List */}
        <div className="space-y-4">
             {selectedCourse.modules?.map((module, mIdx) => (
                 <div key={mIdx} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                     <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-b border-gray-100">
                         <h3 className="font-bold text-gray-800">{module.title}</h3>
                         <button 
                            onClick={() => { setActiveModuleIdx(mIdx); setShowAddVideo(true); }}
                            className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-brand-700"
                         >
                             <Plus size={14} /> Add Content
                         </button>
                     </div>
                     <div className="divide-y divide-gray-100">
                         {module.videos.length === 0 && <div className="p-4 text-center text-gray-400 text-sm">No videos yet.</div>}
                         {module.videos.map((vid, vIdx) => (
                             <div key={vIdx} className="p-4 flex items-center gap-4 hover:bg-gray-50 group">
                                 <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                                     <Video size={20} />
                                 </div>
                                 <div className="flex-1">
                                     <h4 className="font-medium text-gray-900">{vid.title}</h4>
                                     <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                         <span>{vid.duration}</span>
                                         {(vid.resources?.length || 0) > 0 && <span className="flex items-center gap-1 text-orange-600"><FileText size={12}/> {vid.resources?.length} Files</span>}
                                         {vid.notesUrl && <span className="flex items-center gap-1 text-orange-600"><FileText size={12}/> Legacy Note</span>}
                                     </div>
                                 </div>
                                 {/* Admin Actions */}
                                 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button 
                                        onClick={() => handleDeleteVideo(mIdx, vid.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete Content"
                                     >
                                         <Trash2 size={16} />
                                     </button>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
             ))}
             
             <button 
                onClick={() => setShowAddModule(true)}
                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-brand-500 hover:text-brand-600 transition-colors flex justify-center items-center gap-2 font-medium"
             >
                 <Plus size={20} /> Add New Module
             </button>
        </div>

        {/* Add Video Modal */}
        {showAddVideo && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <h3 className="text-lg font-bold mb-4">Add Content to Module</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Video Title</label>
                            <input className="w-full border border-gray-300 rounded-lg px-3 py-2" value={videoForm.title} onChange={e => setVideoForm({...videoForm, title: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20" value={videoForm.description} onChange={e => setVideoForm({...videoForm, description: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Duration</label>
                            <input className="w-full border border-gray-300 rounded-lg px-3 py-2" value={videoForm.duration} onChange={e => setVideoForm({...videoForm, duration: e.target.value})} />
                        </div>

                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                            <label className="block text-sm font-bold mb-2">Upload Video (MP4)</label>
                            <input type="file" accept="video/mp4,video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)} className="text-sm text-gray-500" />
                        </div>

                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                            <label className="block text-sm font-bold mb-2">Attach Notes (PDFs)</label>
                            <div className="flex items-center gap-2">
                                <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <FilePlus size={16} /> Choose Files
                                    <input type="file" multiple accept=".pdf" onChange={e => setNoteFiles(Array.from(e.target.files || []))} className="hidden" />
                                </label>
                                <span className="text-xs text-gray-500">{noteFiles.length} files selected</span>
                            </div>
                            {noteFiles.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                    {noteFiles.map((f, i) => (
                                        <li key={i} className="text-xs text-gray-600 flex items-center gap-1"><FileText size={10}/> {f.name}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <button onClick={() => setShowAddVideo(false)} className="px-4 py-2 text-gray-500">Cancel</button>
                        <button onClick={handleUploadContent} disabled={isUploading || !videoFile} className="px-4 py-2 bg-brand-600 text-white rounded-lg flex items-center gap-2">
                            {isUploading ? <><Loader2 className="animate-spin" size={16} /> {uploadStatus || 'Uploading...'}</> : 'Save Content'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};