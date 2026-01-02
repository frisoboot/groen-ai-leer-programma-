import React from 'react';
import { Subject, AppMode } from '../types';

interface ModeSelectorProps {
  subject: Subject;
  onSelectMode: (mode: AppMode) => void;
  onBack: () => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ subject, onSelectMode, onBack }) => {
  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 max-w-5xl mx-auto relative">
      {/* Global Top-Left Back Button */}
      <div className="absolute top-4 left-4 z-20">
        <button 
            onClick={onBack}
            className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-md border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-all hover:scale-105 active:scale-95"
            title="Terug naar vakken"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
        </button>
      </div>

      <div className="text-center mt-8 mb-8 md:mb-12">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${subject.color} text-white text-3xl mb-4 shadow-lg`}>
            {subject.icon}
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Wat wil je doen voor {subject.name}?</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
        {/* Chat Mode Card */}
        <button
            onClick={() => onSelectMode(AppMode.CHAT)}
            className="group relative bg-white p-6 rounded-2xl border-2 border-transparent hover:border-blue-500 shadow-sm hover:shadow-xl transition-all text-left overflow-hidden flex flex-col h-full min-h-[200px]"
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">💬 Vraag & Uitleg</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
                Stel vragen over theorie en krijg stap-voor-stap uitleg van je AI-tutor.
            </p>
        </button>

        {/* Practice Mode Card (Generated) */}
        <button
            onClick={() => onSelectMode(AppMode.PRACTICE)}
            className="group relative bg-white p-6 rounded-2xl border-2 border-transparent hover:border-purple-500 shadow-sm hover:shadow-xl transition-all text-left overflow-hidden flex flex-col h-full min-h-[200px]"
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">📝 Oefentoets (AI)</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
                Genereer oneindig veel oefenvragen over specifieke onderwerpen.
            </p>
        </button>

        {/* Exam Mode Card (Real Questions) */}
        <button
            onClick={() => onSelectMode(AppMode.EXAM)}
            className="group relative bg-white p-6 rounded-2xl border-2 border-transparent hover:border-red-500 shadow-sm hover:shadow-xl transition-all text-left overflow-hidden flex flex-col h-full min-h-[200px]"
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-red-600 transition-colors">🎓 Eindexamen Training</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
                Oefen met vragen uit <strong>echte eindexamens</strong> van afgelopen jaren (2015-2024).
            </p>
        </button>

        {/* Flashcards Mode Card */}
        <button
            onClick={() => onSelectMode(AppMode.FLASHCARDS)}
            className="group relative bg-white p-6 rounded-2xl border-2 border-transparent hover:border-amber-500 shadow-sm hover:shadow-xl transition-all text-left overflow-hidden flex flex-col h-full min-h-[200px]"
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-amber-600 transition-colors">🗂️ Flashcards</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
                Stamp begrippen en formules met gegenereerde kaartjes.
            </p>
        </button>
      </div>
    </div>
  );
};

export default ModeSelector;