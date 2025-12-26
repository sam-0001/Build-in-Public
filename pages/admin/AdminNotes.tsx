import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { BRANCHES, YEARS } from '../../constants';
import { Plus, Search, FileText, Edit2, X, Check, Save, Trash2, Loader2, FilePlus } from 'lucide-react';
import { ExamNote } from '../../types';

export const AdminNotes: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote, uploadFiles } = useData();
  
  // UI & Filter State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<ExamNote>>({
    title: '',
    price: 0,
    description: '',
    branchSlug: '',
    year: '',
    subject: '',
    coverage: ''
  });
  
  // Upload States
  const [files, setFiles] = useState<File[]>([]);

  const resetForm = () => {
    setFormData({ title: '', price: 0, description: '', branchSlug: '', year: '', subject: '', coverage: '' });
    setFiles([]);
    setEditId(null);
    setIsEditing(false);
    setIsUploading(false);
  };

  const handleEdit = (note: ExamNote) => {
    setFormData({
        title: note.title,
        price: note.price,
        description: note.description,
        branchSlug: note.branchSlug,
        year: note.year,
        subject: note.subject,
        coverage: note.coverage,
    });
    setEditId(note.id);
    setIsEditing(true);
    // Note: We don't preload existing files into the "upload" state for simplicity, 
    // but a real admin panel would show existing files to remove/add.
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete these notes? This action cannot be undone.')) {
      deleteNote(id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.title) return;

    setIsUploading(true);
    try {
        let uploadedFiles = [];
        
        // Handle Multiple File Upload
        if (files.length > 0) {
            const rawUploads = await uploadFiles(files, 'notes_bundles');
            uploadedFiles = rawUploads.map(f => ({
                title: f.originalName.replace('.pdf', ''),
                url: f.key
            }));
        }

        if (editId) {
            // For update, we append new files to existing ones if handled, 
            // but here we just pass the new ones. Ideally backend handles merge.
            // The updated backend logic checks if 'files' is present and updates it.
            // If we want to keep old files, we should have fetched them. 
            // For simplicity in this iteration: Uploading new files REPLACES old ones if provided.
            const payload: any = { ...formData };
            if (uploadedFiles.length > 0) {
                payload.files = uploadedFiles;
            }
            await updateNote(editId, payload);
            alert('Notes updated successfully!');
        } else {
            const newNote: ExamNote = {
                id: `note_${Date.now()}`,
                title: formData.title!,
                branchSlug: formData.branchSlug || 'comp',
                year: formData.year || 'SE',
                subject: formData.subject || 'General',
                description: formData.description || '',
                price: Number(formData.price),
                coverage: formData.coverage || 'Full Syllabus',
                files: uploadedFiles
            };
            await addNote(newNote);
            alert('Notes bundle published!');
        }
        resetForm();
    } catch (error) {
        console.error("Failed to save notes", error);
        alert("Failed to upload notes. Please check the console.");
    } finally {
        setIsUploading(false);
    }
  };

  // Filter Logic
  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    note.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Exam Notes</h1>
           <p className="text-gray-500 text-sm">Upload PDF bundles (Multiple files supported)</p>
        </div>
        {!isEditing && (
            <button 
            onClick={() => setIsEditing(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
            >
            <Plus size={18} /> Add New Bundle
            </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">{editId ? 'Edit Notes' : 'Create New Bundle'}</h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Form */}
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bundle Title</label>
                        <input 
                            required
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 bg-white"
                            placeholder="e.g. Unit 1-3 Model Answers"
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                            <select 
                                required
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white text-gray-900"
                                value={formData.branchSlug}
                                onChange={e => setFormData({...formData, branchSlug: e.target.value})}
                            >
                                <option value="">Select</option>
                                {BRANCHES.map(b => <option key={b.id} value={b.slug}>{b.name}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                             <select 
                                required
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white text-gray-900"
                                value={formData.year}
                                onChange={e => setFormData({...formData, year: e.target.value})}
                            >
                                <option value="">Select</option>
                                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                            <input 
                                required
                                type="text" 
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 bg-white"
                                value={formData.subject}
                                onChange={e => setFormData({...formData, subject: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                            <input 
                                required
                                type="number" 
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 bg-white"
                                value={formData.price}
                                onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                            />
                        </div>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Syllabus Coverage</label>
                         <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 bg-white"
                            placeholder="e.g. Full Syllabus, In-Sem Only"
                            value={formData.coverage}
                            onChange={e => setFormData({...formData, coverage: e.target.value})}
                         />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea 
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none h-20 text-gray-900 bg-white"
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                        />
                    </div>
                </div>

                {/* Right Column: Upload */}
                <div className="flex flex-col">
                     <label className="block text-sm font-medium text-gray-700 mb-1">Upload Files (PDF)</label>
                     <div className={`flex-1 border-2 border-dashed rounded-xl p-8 text-center transition-colors flex flex-col items-center justify-center ${files.length > 0 ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-slate-400 hover:bg-gray-50'}`}>
                        <input type="file" id="notes-upload" className="hidden" multiple accept=".pdf" onChange={e => setFiles(Array.from(e.target.files || []))} />
                        <label htmlFor="notes-upload" className="cursor-pointer flex flex-col items-center w-full h-full justify-center">
                            <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 ${files.length > 0 ? 'bg-green-100 text-green-600' : 'bg-brand-50 text-brand-600'}`}>
                                {files.length > 0 ? <Check size={32}/> : <FilePlus size={32} />}
                            </div>
                            <span className="font-bold text-gray-900 text-lg">{files.length > 0 ? `${files.length} Files Selected` : 'Click to Upload PDFs'}</span>
                            <span className="text-sm text-gray-500 mt-2">{files.length > 0 ? 'Ready to upload' : 'Multiple files allowed'}</span>
                        </label>
                    </div>
                    {files.length > 0 && (
                        <div className="mt-4 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
                            {files.map((f, i) => (
                                <div key={i} className="text-xs text-gray-600 flex items-center gap-2 py-1">
                                    <FileText size={12} /> {f.name}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-8 flex justify-end gap-3">
                         <button type="button" onClick={resetForm} className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={isUploading} className="px-6 py-2 rounded-lg bg-brand-600 text-white font-bold hover:bg-brand-700 transition-colors shadow-sm flex items-center gap-2">
                             {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} {editId ? 'Update & Replace Files' : 'Upload Bundle'}
                        </button>
                    </div>
                </div>
            </div>
          </form>
        </div>
      ) : (
        /* Notes List Table */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
           <div className="p-4 border-b border-gray-100 flex gap-4">
              <div className="relative flex-1">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input 
                    type="text" 
                    placeholder="Search notes..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 text-gray-900 bg-white" 
                 />
              </div>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                      <tr>
                          <th className="px-6 py-4 font-medium">Title</th>
                          <th className="px-6 py-4 font-medium">Subject</th>
                          <th className="px-6 py-4 font-medium">Files</th>
                          <th className="px-6 py-4 font-medium">Price</th>
                          <th className="px-6 py-4 font-medium text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {filteredNotes.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-gray-500 text-sm">
                                No notes found.
                            </td>
                        </tr>
                      ) : (
                        filteredNotes.map(note => (
                          <tr key={note.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                                         <FileText size={20} />
                                      </div>
                                      <div>
                                          <p className="font-semibold text-gray-900 text-sm">{note.title}</p>
                                          <p className="text-xs text-gray-500">{note.coverage}</p>
                                      </div>
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                                  {note.subject}
                              </td>
                              <td className="px-6 py-4">
                                  <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 uppercase font-semibold">
                                     {note.files?.length || 1} File(s)
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                  ₹{note.price}
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                      <button 
                                        type="button"
                                        onClick={() => handleEdit(note)}
                                        className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                        title="Edit"
                                      >
                                          <Edit2 size={16} />
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => handleDelete(note.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              </td>
                          </tr>
                        ))
                      )}
                  </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
};