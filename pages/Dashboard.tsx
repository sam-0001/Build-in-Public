import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { BookOpen, FileText, User, ArrowRight, PlayCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ExamNote } from '../types';
import { PdfViewerModal } from '../components/PdfViewerModal';

export const Dashboard: React.FC = () => {
  const { user, token, apiUrl } = useAuth();
  const { courses, notes } = useData();
  const navigate = useNavigate();

  // PDF Viewer State
  const [pdfViewerState, setPdfViewerState] = useState<{ isOpen: boolean, url: string, title: string }>({
    isOpen: false, url: '', title: ''
  });

  if (!user) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <p>Please log in to view dashboard.</p>
        </div>
    )
  }

  const myCourses = courses.filter(c => user.purchasedCourseIds.includes(c.id));
  const myNotes = notes.filter(n => user.purchasedNoteIds.includes(n.id));

  const getProgress = (courseId: string, totalVideos: number) => {
     if (!totalVideos || totalVideos === 0) return 0;
     const completed = user.courseProgress[courseId]?.length || 0;
     return Math.round((completed / totalVideos) * 100);
  };

  const openNote = async (note: ExamNote) => {
    if(!note.fileUrl) return;
    try {
        const res = await fetch(`${apiUrl}/media/sign?key=${encodeURIComponent(note.fileUrl)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setPdfViewerState({ isOpen: true, url: data.url, title: note.title });
    } catch(e) {
        alert("Could not load document.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Dashboard</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Profile Card */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-16 w-16 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 shrink-0">
                            <User size={32} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-gray-900 truncate">{user.firstName} {user.lastName}</h2>
                            <p className="text-sm text-gray-500 break-all">{user.email}</p>
                        </div>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between border-b border-gray-100 pb-2">
                            <span className="text-gray-500">Branch</span>
                            <span className="font-medium capitalize">{user.branch}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100 pb-2">
                            <span className="text-gray-500">Year</span>
                            <span className="font-medium">{user.year}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">College</span>
                            <span className="font-medium text-right line-clamp-1 pl-4">{user.college}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
                
                {/* Courses Section */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <BookOpen className="text-brand-600" size={24} /> My Courses
                    </h2>
                    {myCourses.length === 0 ? (
                        <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                            <p className="text-gray-500 mb-4">You haven't purchased any courses yet.</p>
                            <Link to="/" className="text-brand-600 font-semibold hover:underline">Explore Courses</Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {myCourses.map(course => {
                                const progress = getProgress(course.id, course.videoCount);
                                return (
                                    <div key={course.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow flex flex-col">
                                        <div className="flex items-start gap-4 mb-4">
                                            <img src={course.thumbnail} alt="" className="w-20 h-14 object-cover rounded-lg bg-gray-100 shrink-0" />
                                            <div>
                                                <h3 className="font-bold text-gray-900 line-clamp-1">{course.title}</h3>
                                                <p className="text-xs text-gray-500">{course.videoCount} Lessons</p>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-auto space-y-3">
                                            <div className="w-full bg-gray-100 rounded-full h-2">
                                                <div className="bg-brand-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500">{progress}% Complete</span>
                                                <Link 
                                                    to={`/player/${course.id}`}
                                                    className="flex items-center gap-1 text-brand-700 font-bold hover:underline"
                                                >
                                                    Continue <ArrowRight size={12} />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Notes Section */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="text-orange-600" size={24} /> My Notes
                    </h2>
                    {myNotes.length === 0 ? (
                        <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                            <p className="text-gray-500 mb-4">You haven't purchased any exam notes yet.</p>
                            <Link to="/" className="text-brand-600 font-semibold hover:underline">Browse Notes</Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {myNotes.map(note => (
                                <div key={note.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 line-clamp-1">{note.title}</h3>
                                            <p className="text-xs text-gray-500">{note.subject}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => openNote(note)}
                                        className="bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                                    >
                                        Read Now
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
      </div>

      <PdfViewerModal
        isOpen={pdfViewerState.isOpen}
        onClose={() => setPdfViewerState({ ...pdfViewerState, isOpen: false })}
        pdfUrl={pdfViewerState.url}
        title={pdfViewerState.title}
      />
    </div>
  );
};