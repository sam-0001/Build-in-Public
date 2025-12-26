
export type Role = 'student' | 'admin';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  branch?: string;
  year?: string;
  college?: string;
  purchasedCourseIds: string[];
  purchasedNoteIds: string[];
  courseProgress: Record<string, string[]>; // courseId -> array of completed videoIds
}

export interface Branch {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export interface Resource {
  title: string;
  url: string; // R2 Key
  type: 'pdf' | 'link' | 'other';
}

export interface VideoModule {
  _id?: string; // MongoDB ID
  id: string;   // Frontend ID
  title: string;
  description?: string;
  duration: string;
  videoUrl: string; // R2 URL
  notesUrl?: string; // Legacy R2 URL for attached PDF
  resources?: Resource[]; // New: Multiple resources
  isFreePreview?: boolean;
}

export interface CourseModule {
  _id?: string;
  title: string;
  videos: VideoModule[];
}

export interface Course {
  _id?: string;
  id: string;
  title: string;
  branchSlug: string;
  year: string;
  description: string;
  price: number;
  thumbnail: string;
  videoCount: number;
  pdfCount: number;
  modules?: CourseModule[]; // Full content structure
}

export interface NoteFile {
  title: string;
  url: string;
}

export interface ExamNote {
  _id?: string;
  id: string;
  title: string;
  branchSlug: string;
  year: string;
  subject: string;
  description: string;
  price: number;
  coverage: string;
  fileUrl?: string; // Legacy Single R2 URL
  files?: NoteFile[]; // New: Multiple files
}

export type ContentType = 'courses' | 'notes';