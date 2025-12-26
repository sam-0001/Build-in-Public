import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Course, ExamNote } from '../types';
import { useAuth } from './AuthContext';

interface DataContextType {
  courses: Course[];
  notes: ExamNote[];
  loading: boolean;
  refreshData: () => Promise<void>;
  addCourse: (course: Course) => Promise<void>;
  updateCourse: (id: string, updatedData: Partial<Course>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  addNote: (note: ExamNote) => Promise<void>;
  updateNote: (id: string, updatedData: Partial<ExamNote>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  uploadFile: (file: File, folder?: string) => Promise<string>; // Returns R2 Key
  uploadFiles: (files: File[], folder?: string) => Promise<{ originalName: string, key: string }[]>; // Multiple
  deleteVideo: (courseId: string, moduleIdx: number, videoId: string) => Promise<void>;
  updateVideo: (courseId: string, moduleIdx: number, videoId: string, data: any) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { apiUrl } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [notes, setNotes] = useState<ExamNote[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    if (!apiUrl) return;
    try {
        setLoading(true);
        const [cRes, nRes] = await Promise.all([
            fetch(`${apiUrl}/courses`),
            fetch(`${apiUrl}/notes`)
        ]);
        if (cRes.ok) setCourses(await cRes.json());
        if (nRes.ok) setNotes(await nRes.json());
    } catch (e) {
        console.error("Failed to fetch data", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [apiUrl]);

  const uploadFile = async (file: File, folder: string = 'uploads'): Promise<string> => {
      const uploadUrl = `${apiUrl}/upload`;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      try {
          const res = await fetch(uploadUrl, { method: 'POST', body: formData });
          if (!res.ok) {
              const err = await res.json().catch(() => ({ message: res.statusText }));
              throw new Error(err.message || 'Upload failed');
          }
          const data = await res.json();
          return data.key;
      } catch (error) {
          console.error("❌ Upload Failed:", error);
          throw error;
      }
  };

  const uploadFiles = async (files: File[], folder: string = 'uploads'): Promise<{ originalName: string, key: string }[]> => {
      const uploadUrl = `${apiUrl}/upload/multiple`;
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      formData.append('folder', folder);

      try {
          const res = await fetch(uploadUrl, { method: 'POST', body: formData });
          if (!res.ok) {
               throw new Error('Multiple Upload failed');
          }
          const data = await res.json();
          return data.uploadedItems;
      } catch (error) {
          console.error("❌ Multiple Upload Failed:", error);
          throw error;
      }
  };

  // --- Course Actions ---
  const addCourse = async (course: Course) => {
    await fetch(`${apiUrl}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(course)
    });
    await refreshData();
  };

  const updateCourse = async (id: string, updatedData: Partial<Course>) => {
    const existing = courses.find(c => c.id === id);
    const payload = { ...existing, ...updatedData, id };
    await fetch(`${apiUrl}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    await refreshData();
  };

  const deleteCourse = async (id: string) => {
    await fetch(`${apiUrl}/courses/${id}`, { method: 'DELETE' });
    await refreshData();
  };

  const deleteVideo = async (courseId: string, moduleIdx: number, videoId: string) => {
      await fetch(`${apiUrl}/courses/${courseId}/modules/${moduleIdx}/videos/${videoId}`, { method: 'DELETE' });
      await refreshData();
  };

  const updateVideo = async (courseId: string, moduleIdx: number, videoId: string, data: any) => {
      await fetch(`${apiUrl}/courses/${courseId}/modules/${moduleIdx}/videos/${videoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
      });
      await refreshData();
  };

  // --- Note Actions ---
  const addNote = async (note: ExamNote) => {
    await fetch(`${apiUrl}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note)
    });
    await refreshData();
  };

  const updateNote = async (id: string, updatedData: Partial<ExamNote>) => {
    const existing = notes.find(n => n.id === id);
    const payload = { ...existing, ...updatedData, id };
    await fetch(`${apiUrl}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    await refreshData();
  };

  const deleteNote = async (id: string) => {
    await fetch(`${apiUrl}/notes/${id}`, { method: 'DELETE' });
    await refreshData();
  };

  return (
    <DataContext.Provider value={{
      courses,
      notes,
      loading,
      refreshData,
      addCourse,
      updateCourse,
      deleteCourse,
      addNote,
      updateNote,
      deleteNote,
      uploadFile,
      uploadFiles,
      deleteVideo,
      updateVideo
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};