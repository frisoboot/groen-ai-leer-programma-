import React, { useState, useEffect } from 'react';
import { Subject, AppMode, UserProfile } from './types';
import { SUBJECTS } from './constants';
import SubjectCard from './components/SubjectCard';
import ChatInterface from './components/ChatInterface';
import PracticeInterface from './components/PracticeInterface';
import FlashcardInterface from './components/FlashcardInterface';
import ModeSelector from './components/ModeSelector';
import Onboarding from './components/Onboarding';

const App: React.FC = () => {
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [activeMode, setActiveMode] = useState<AppMode | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Load profile from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('exam_buddy_profile');
    if (savedProfile) {
      try {
        setUserProfile(JSON.parse(savedProfile));
      } catch (e) {
        console.error("Failed to parse profile", e);
      }
    }
  }, []);

  const handleProfileComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem('exam_buddy_profile', JSON.stringify(profile));
  };

  const handleResetProfile = () => {
    localStorage.removeItem('exam_buddy_profile');
    setUserProfile(null);
    setActiveSubject(null);
    setActiveMode(null);
  };

  const handleSubjectSelect = (subject: Subject) => {
    setActiveSubject(subject);
    setActiveMode(null); // Reset mode when picking a new subject
  };

  const handleBackToSubjects = () => {
    setActiveSubject(null);
    setActiveMode(null);
  };

  const handleBackToModeSelect = () => {
    setActiveMode(null);
  };

  // If no profile, show Onboarding
  if (!userProfile) {
    return <Onboarding onComplete={handleProfileComplete} />;
  }

  // Render Logic
  if (activeSubject && activeMode === AppMode.CHAT) {
    return <ChatInterface subject={activeSubject} profile={userProfile} onBack={handleBackToModeSelect} />;
  }

  if (activeSubject && activeMode === AppMode.PRACTICE) {
    return <PracticeInterface subject={activeSubject} profile={userProfile} onBack={handleBackToModeSelect} />;
  }

  if (activeSubject && activeMode === AppMode.FLASHCARDS) {
    return <FlashcardInterface subject={activeSubject} profile={userProfile} onBack={handleBackToModeSelect} />;
  }

  if (activeSubject) {
    return (
        <ModeSelector 
            subject={activeSubject} 
            onSelectMode={setActiveMode} 
            onBack={handleBackToSubjects} 
        />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <header className="text-center mb-12 max-w-2xl">
        <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
            Examen<span className="text-blue-600">Buddy</span>
            </h1>
        </div>
        
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-800 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <span>Hoi, {userProfile.name}! ({userProfile.level.toUpperCase()} {userProfile.year})</span>
            <button onClick={handleResetProfile} className="text-blue-400 hover:text-blue-600 ml-2" title="Profiel wijzigen">
                ✏️
            </button>
        </div>

        <p className="text-lg text-gray-600 leading-relaxed">
          Kies een vak, stel je vragen, maak oefentoetsen of stamp begrippen. Allemaal afgestemd op jouw niveau. 🎓
        </p>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {SUBJECTS.map((subject) => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            onClick={handleSubjectSelect}
          />
        ))}
      </main>

      <footer className="mt-16 text-center text-gray-400 text-sm">
        <p>© {new Date().getFullYear()} VWO ExamenBuddy. Powered by Gemini AI.</p>
      </footer>
    </div>
  );
};

export default App;