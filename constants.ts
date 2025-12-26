import { Branch, Course, ExamNote } from './types';

export const BRANCHES: Branch[] = [
  { id: '1', name: 'Computer Engineering', slug: 'comp', description: 'Software, Algorithms, and AI', icon: 'Code' },
  { id: '2', name: 'Information Technology', slug: 'it', description: 'Network, Systems, and Data', icon: 'Cpu' },
  { id: '3', name: 'Mechanical Engineering', slug: 'mech', description: 'Machines, Robotics, and Design', icon: 'Settings' },
  { id: '4', name: 'Civil Engineering', slug: 'civil', description: 'Infrastructure and Construction', icon: 'Home' },
  { id: '5', name: 'E&TC Engineering', slug: 'entc', description: 'Electronics and Communication', icon: 'Wifi' },
  { id: '6', name: 'AI & Data Science', slug: 'aids', description: 'Machine Learning and Big Data', icon: 'Database' },
];

export const YEARS = ['FE', 'SE', 'TE', 'BE'];

export const MOCK_COURSES: Course[] = [];
export const MOCK_NOTES: ExamNote[] = [];
export const MOCK_COURSE_CONTENT: Record<string, any> = {};