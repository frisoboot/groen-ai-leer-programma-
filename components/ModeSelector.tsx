import React from 'react';
import { Subject, AppMode } from '../types';

interface ModeSelectorProps {
  subject: Subject;
  onSelectMode: (mode: AppMode) => void;
  onBack: () => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ subject, onSelectMode, onBack }) => {
  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 max-w-5xl mx-auto">
      <button 
        onClick={onBack}
        className="self-start mb-8 flex items-center text-gray-500 hover:text-gray-900 transition-colors"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Terug naar vakken
      </button>

      <div className="text-center mb-10">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${subject.color} text-white text-3xl mb-4 shadow-lg`}>
            {subject.icon}
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Wat wil je doen voor {subject.name}?</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-6 w-full">
        {/* Chat Mode Card */}
        <button
            onClick={() => onSelectMode(AppMode.CHAT)}
            className="group relative bg-white p-6 lg:p-8 rounded-2xl border-2 border-transparent hover:border-blue-500 shadow-sm hover:shadow-xl transition-all text-left overflow-hidden flex flex-col h-full"
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">💬 Vraag & Uitleg</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
                Stel vragen over theorie en krijg stap-voor-stap uitleg.
            </p>
        </button>

        {/* Practice Mode Card */}
        <button
            onClick={() => onSelectMode(AppMode.PRACTICE)}
            className="group relative bg-white p-6 lg:p-8 rounded-2xl border-2 border-transparent hover:border-purple-500 shadow-sm hover:shadow-xl transition-all text-left overflow-hidden flex flex-col h-full"
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">📝 Oefentoets</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
                Maak open examenvragen met automatische feedback.
            </p>
        </button>

        {/* Flashcards Mode Card */}
        <button
            onClick={() => onSelectMode(AppMode.FLASHCARDS)}
            className="group relative bg-white p-6 lg:p-8 rounded-2xl border-2 border-transparent hover:border-amber-500 shadow-sm hover:shadow-xl transition-all text-left overflow-hidden flex flex-col h-full"
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
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
