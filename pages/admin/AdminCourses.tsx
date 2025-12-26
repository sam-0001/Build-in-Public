import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { BRANCHES, YEARS } from '../../constants';
import { Plus, Search, Edit2, X, Check, Save, Image as ImageIcon, Trash2, Loader2 } from 'lucide-react';
import { Course } from '../../types';

export const AdminCourses: React.FC = () => {
  const { courses, addCourse, updateCourse, deleteCourse, uploadFile } = useData();
  
  // UI State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');

  // Form State
  const [formData, setFormData] = useState<Partial<Course>>({
    title: '',
    price: 0,
    description: '',
    branchSlug: '',
    year: '',
  });
  
  // Upload State
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const resetForm = () => {
    setFormData({ title: '', price: 0, description: '', branchSlug: '', year: '' });
    setThumbnailFile(null);
    setEditId(null);
    setIsEditing(false);
    setIsUploading(false);
  };

  const handleEdit = (course: Course) => {
    setFormData({
        title: course.title,
        price: course.price,
        description: course.description,
        branchSlug: course.branchSlug,
        year: course.year,
    });
    setEditId(course.id);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      await deleteCourse(id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.title || !formData.branchSlug) return;
    
    setIsUploading(true);
    try {
        const courseId = editId || `c_${Date.now()}`;

        let thumbnailUrl = courses.find(c => c.id === editId)?.thumbnail || '';
        
        if (thumbnailFile) {
            console.log("Uploading thumbnail...");
            thumbnailUrl = await uploadFile(thumbnailFile, 'thumbnails');
            console.log("Thumbnail Key:", thumbnailUrl);
        }

        const payload: Course = {
            id: courseId,
            title: formData.title!,
            branchSlug: formData.branchSlug!,
            year: formData.year || 'FE',
            description: formData.description || '',
            price: Number(formData.price),
            thumbnail: thumbnailUrl,
            videoCount: 0, 
            pdfCount: 0 
        };

        if (editId) {
            await updateCourse(editId, payload);
        } else {
            await addCourse(payload);
        }
        resetForm();
    } catch (error: any) {
        console.error("Error saving course:", error);
        alert(`Failed to save course. Server said: ${error.message || 'Unknown Error'}`);
    } finally {
        setIsUploading(false);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = filterBranch === 'all' || course.branchSlug === filterBranch;
    return matchesSearch && matchesBranch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Courses Metadata</h1>
           <p className="text-gray-500 text-sm">Create courses first, then add videos in Media Library.</p>
        </div>
        {!isEditing && (
            <button 
            onClick={() => setIsEditing(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
            >
            <Plus size={18} /> Create Course Shell
            </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">{editId ? 'Edit Course Details' : 'Create New Course'}</h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* 1. Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
                    <input 
                        required
                        type="text" 
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 bg-white"
                        placeholder="e.g. Master React JS"
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
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
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                    <select 
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white text-gray-900"
                        value={formData.branchSlug}
                        onChange={e => setFormData({...formData, branchSlug: e.target.value})}
                    >
                        <option value="">Select Branch</option>
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
                        <option value="">Select Year</option>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div className="col-span-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea 
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none h-24 text-gray-900 bg-white"
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                </div>
            </div>

            {/* Thumbnail Upload */}
            <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${thumbnailFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'}`}>
                <input type="file" id="thumb-upload" className="hidden" accept="image/*" onChange={e => setThumbnailFile(e.target.files?.[0] || null)} />
                <label htmlFor="thumb-upload" className="cursor-pointer flex flex-col items-center h-full justify-center">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-2 ${thumbnailFile ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'}`}>
                        {thumbnailFile ? <Check size={20}/> : <ImageIcon size={20} />}
                    </div>
                    <span className="font-medium text-gray-900 text-sm">{thumbnailFile ? 'Thumbnail Selected' : 'Upload Course Thumbnail'}</span>
                    <span className="text-xs text-gray-500 mt-1">PNG, JPG (16:9)</span>
                </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={resetForm} className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                    Cancel
                </button>
                <button type="submit" disabled={isUploading} className="px-6 py-2 rounded-lg bg-brand-600 text-white font-bold hover:bg-brand-700 transition-colors shadow-sm flex items-center gap-2">
                    {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} 
                    {editId ? 'Update Course' : 'Create Course'}
                </button>
            </div>
          </form>
        </div>
      ) : (
        /* Course List Table */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
           <div className="p-4 border-b border-gray-100 flex gap-4">
              <div className="relative flex-1">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input 
                    type="text" 
                    placeholder="Search courses..." 
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
                          <th className="px-6 py-4 font-medium">Course</th>
                          <th className="px-6 py-4 font-medium">Branch</th>
                          <th className="px-6 py-4 font-medium">Price</th>
                          <th className="px-6 py-4 font-medium text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {filteredCourses.map(course => (
                          <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                      {/* Pre-signed URL from context */}
                                      <img src={course.thumbnail} className="h-10 w-16 object-cover rounded bg-gray-100" alt="" />
                                      <div>
                                          <p className="font-semibold text-gray-900 text-sm">{course.title}</p>
                                          <p className="text-xs text-gray-500">ID: {course.id}</p>
                                      </div>
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                  <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-md font-medium uppercase">
                                      {course.branchSlug} - {course.year}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                  ₹{course.price}
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                      <button 
                                        type="button"
                                        onClick={() => handleEdit(course)}
                                        className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                      >
                                          <Edit2 size={16} />
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => handleDelete(course.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
};