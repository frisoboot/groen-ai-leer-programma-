import React, { useState, useEffect } from 'react';
import { Subject, PracticeTurn, QuizFeedback, UserProfile } from '../types';
import { startPracticeSession, submitAnswerAndGetNext, getSuggestedTopics, generateQuizSummary } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';
import { Content } from '@google/genai';

interface PracticeInterfaceProps {
  subject: Subject;
  profile: UserProfile;
  onBack: () => void;
  onHome: () => void;
  isExamMode?: boolean; // New prop to distinguish between Quiz and Real Exam
}

const PracticeInterface: React.FC<PracticeInterfaceProps> = ({ subject, profile, onBack, onHome, isExamMode = false }) => {
  const [setupMode, setSetupMode] = useState(true);
  const [topicInput, setTopicInput] = useState('');
  const [questionLimit, setQuestionLimit] = useState(5);
  
  // New state for suggested topics
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  const [currentTurn, setCurrentTurn] = useState<PracticeTurn | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [history, setHistory] = useState<Content[]>([]);
  const [sessionScore, setSessionScore] = useState({ correct: 0, total: 0 });
  const [showFeedback, setShowFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [summary, setSummary] = useState<string>('');
  
  // State for hint visibility
  const [showHint, setShowHint] = useState(false);

  // Fetch topics on mount or when returning to setup, but only if empty
  useEffect(() => {
    if (setupMode && suggestedTopics.length === 0) {
        setLoadingTopics(true);
        getSuggestedTopics(subject, profile)
            .then(setSuggestedTopics)
            .finally(() => setLoadingTopics(false));
    }
  }, [subject, profile, setupMode, suggestedTopics.length]);

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => 
        prev.includes(topic) 
            ? prev.filter(t => t !== topic) 
            : [...prev, topic]
    );
  };

  const startSession = async () => {
    setLoading(true);
    setLoadingMessage(isExamMode 
        ? `Oude eindexamens doorzoeken (2021-2024) voor ${subject.name}...`
        : `Toets wordt voorbereid voor ${profile.level} ${profile.year}...`
    );
    setSessionScore({ correct: 0, total: 0 });
    setIsFinished(false);
    setSummary('');
    setShowHint(false); // Reset hint
    
    // Combine selected topics and custom input
    const finalTopics = [
        ...selectedTopics, 
        topicInput.trim()
    ].filter(Boolean).join(', ');

    try {
      const { turn, prompt } = await startPracticeSession(subject, profile, finalTopics, isExamMode);
      setCurrentTurn(turn);
      setHistory([
          { role: 'user', parts: [{ text: prompt }] },
          { role: 'model', parts: [{ text: JSON.stringify(turn) }] }
      ]);
      setSetupMode(false);
    } catch (e) {
      console.error(e);
      alert("Kon de toets niet starten. Probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!userAnswer.trim() || !currentTurn) return;

    setIsSubmitting(true);
    try {
      const { turn: nextTurn, updatedHistory } = await submitAnswerAndGetNext(
        subject,
        history,
        userAnswer,
        profile,
        isExamMode
      );

      if (nextTurn.feedback) {
        setSessionScore(prev => ({
          total: prev.total + 1,
          correct: nextTurn.feedback!.score >= 6 ? prev.correct + 1 : prev.correct
        }));
      }

      setCurrentTurn(nextTurn);
      setHistory(updatedHistory);
      setShowFeedback(true);
      setShowHint(false); // Reset hint for next question logic (though visible only on next render)
      
    } catch (e) {
      console.error(e);
      alert("Er ging iets mis bij het nakijken. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = async () => {
    // Check if we reached the limit
    if (sessionScore.total >= questionLimit) {
        setLoading(true);
        setLoadingMessage("Je resultaten worden geanalyseerd...");
        try {
            const summaryText = await generateQuizSummary(subject, history, profile);
            setSummary(summaryText);
            setIsFinished(true);
        } catch (e) {
            console.error("Summary error", e);
            setIsFinished(true);
        } finally {
            setLoading(false);
        }
    } else {
        setUserAnswer('');
        setShowFeedback(false);
        setShowHint(false); // Reset hint
    }
  };

  const handleRestart = () => {
      setSetupMode(true);
      setIsFinished(false);
      setSessionScore({ correct: 0, total: 0 });
      setHistory([]);
      setUserAnswer('');
      setShowFeedback(false);
      setShowHint(false); // Reset hint
      setSummary('');
  };

  const renderAttachment = (attachment: any) => {
    // Only render TEXT attachments (often used for languages). Ignore images.
    if (attachment.type === 'text') {
        return (
            <div className="bg-slate-50 border-l-4 border-slate-400 p-4 md:p-6 rounded-r-xl shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider">{attachment.title || 'Bijlage: Tekst'}</h4>
                </div>
                <div className="prose prose-slate max-w-none text-slate-800 font-serif leading-relaxed text-base md:text-lg border-t border-slate-200 pt-3">
                        <MarkdownRenderer content={attachment.content} />
                </div>
            </div>
        );
    } 
    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white">
        <div className={`w-16 h-16 border-4 border-t-transparent rounded-full animate-spin ${subject.color.replace('bg-', 'border-')}`}></div>
        <p className="mt-4 text-gray-600 font-medium animate-pulse">{loadingMessage}</p>
      </div>
    );
  }

  // Summary Screen (Finished)
  if (isFinished) {
    const percentage = Math.round((sessionScore.correct / sessionScore.total) * 10);
    const grade = Math.max(1, percentage);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
             {/* Global Top-Left Back Button for Finished Screen */}
             <div className="absolute top-4 left-4 z-20">
                <button 
                    onClick={onBack}
                    className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-md border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-all hover:scale-105 active:scale-95"
                    title="Sluiten"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="bg-white p-6 md:p-10 rounded-3xl shadow-xl max-w-2xl w-full text-center my-8 relative">
                <div className={`w-24 h-24 mx-auto rounded-full ${grade >= 6 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} flex items-center justify-center text-5xl mb-6 shadow-sm`}>
                    {grade >= 6 ? '🏆' : '📚'}
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">{isExamMode ? 'Examen Training' : 'Toets'} Afgerond!</h2>
                <p className="text-gray-500 mb-8">Hier is hoe je het hebt gedaan.</p>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Vragen Goed</p>
                        <p className="text-3xl font-extrabold text-gray-800">{sessionScore.correct} <span className="text-gray-400 text-xl font-medium">/ {sessionScore.total}</span></p>
                    </div>
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Geschat Cijfer</p>
                        <p className={`text-3xl font-extrabold ${grade >= 6 ? 'text-green-600' : 'text-red-600'}`}>{grade}</p>
                    </div>
                </div>

                {summary && (
                    <div className="text-left bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-8">
                        <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Feedback van je Buddy
                        </h3>
                        <div className="prose prose-sm prose-blue max-w-none text-gray-700">
                             <MarkdownRenderer content={summary} />
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                        onClick={onHome}
                        className="flex-1 py-3.5 text-gray-600 hover:bg-gray-50 rounded-xl font-bold transition-colors"
                    >
                        Naar Home
                    </button>
                    <button 
                        onClick={handleRestart}
                        className={`flex-1 py-3.5 text-white rounded-xl font-bold shadow-lg transform transition-transform active:scale-95 ${subject.color}`}
                    >
                        Nog een keer {isExamMode ? 'examen oefenen' : 'oefenen'}
                    </button>
                </div>
            </div>
        </div>
    );
  }

  // Setup Screen (Topic Selection)
  if (setupMode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 relative">
        {/* Global Top-Left Back Button */}
        <div className="absolute top-4 left-4 z-20">
            <button 
                onClick={onBack}
                className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-md border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-all hover:scale-105 active:scale-95"
                title="Terug"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl max-w-2xl w-full my-8">
           <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-xl ${subject.color} flex items-center justify-center text-2xl text-white shadow-md`}>
                    {subject.icon}
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{isExamMode ? 'Eindexamen Training' : 'Oefentoets Starten'}</h2>
                    <p className="text-gray-500">{isExamMode ? 'Oefen met échte examenvragen (2021-2024)' : 'Genereerde vragen over specifieke stof'}</p>
                </div>
           </div>

           {/* Number of Questions Selection */}
           <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Aantal Vragen</h3>
                <div className="flex flex-wrap gap-2">
                    {[3, 5, 10, 20].map((num) => (
                        <button
                            key={num}
                            onClick={() => setQuestionLimit(num)}
                            className={`px-4 py-2 rounded-lg font-bold border-2 transition-all ${
                                questionLimit === num
                                ? `border-blue-500 bg-blue-50 text-blue-700`
                                : 'border-gray-100 text-gray-600 hover:border-blue-200'
                            }`}
                        >
                            {num} Vragen
                        </button>
                    ))}
                </div>
           </div>

           {/* Generated Topics Grid */}
           <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
                    {isExamMode ? 'Kies domeinen (optioneel)' : 'Kies onderwerpen'}
                </h3>
                {loadingTopics ? (
                    <div className="py-6 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mb-3 ${subject.color.replace('bg-', 'border-')}`}></div>
                        <p className="text-sm text-gray-500 font-medium animate-pulse">Examenonderwerpen ophalen...</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full px-4 mt-4 opacity-30 pointer-events-none">
                            {[1,2,3,4].map(i => <div key={i} className="h-10 bg-gray-300 rounded-lg"></div>)}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                        {suggestedTopics.map((topic) => (
                            <button
                                key={topic}
                                onClick={() => toggleTopic(topic)}
                                className={`text-sm py-2 px-3 rounded-lg border-2 font-medium transition-all truncate text-left ${
                                    selectedTopics.includes(topic) 
                                    ? `border-blue-500 bg-blue-50 text-blue-700` 
                                    : 'border-gray-100 text-gray-600 hover:border-blue-200 hover:bg-gray-50'
                                }`}
                                title={topic}
                            >
                                {topic}
                            </button>
                        ))}
                    </div>
                )}
           </div>
           
           <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Of typ zelf een onderwerp</h3>
                <input 
                    type="text" 
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder={isExamMode ? "Bijv. 'Examen 2023' of 'Meetkunde'" : "Bijv. 'Koude Oorlog'"}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 placeholder-gray-400"
                />
           </div>

           <div className="flex gap-3 pt-4 border-t border-gray-100">
             <button 
               onClick={startSession}
               className={`flex-1 py-4 text-white rounded-xl font-bold shadow-md transition-transform active:scale-95 ${subject.color}`}
             >
               {isExamMode ? 'Start Examentraining 🎓' : 'Start Oefentoets 🚀'}
             </button>
           </div>
        </div>
      </div>
    );
  }

  // Active Quiz Interface
  return (
    <div className="flex flex-col h-screen bg-gray-50 md:max-w-4xl md:mx-auto">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
            <button 
                onClick={() => { setSetupMode(true); setSelectedTopics([]); setTopicInput(''); }} 
                className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                title="Stoppen en terug"
            >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="hidden sm:block w-px h-6 bg-gray-200 mx-1"></div>
            <div>
                <h2 className="font-bold text-gray-800 text-sm md:text-base">{isExamMode ? 'Examen Vraag' : 'Oefenvraag'}</h2>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Vraag {sessionScore.total + 1} / {questionLimit}</span>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
            <div className="w-16 md:w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                    className={`h-full ${subject.color} transition-all duration-500`}
                    style={{ width: `${((sessionScore.total) / questionLimit) * 100}%` }}
                ></div>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        
        {/* Previous Feedback Section */}
        {showFeedback && currentTurn?.feedback && (
            <div className={`rounded-xl border p-6 animate-fade-in ${currentTurn.feedback.score >= 6 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-bold text-lg ${currentTurn.feedback.score >= 6 ? 'text-green-800' : 'text-red-800'}`}>
                        {currentTurn.feedback.score >= 6 ? 'Goed gedaan!' : 'Nog even oefenen'}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${currentTurn.feedback.score >= 6 ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                        Cijfer: {currentTurn.feedback.score}
                    </span>
                </div>
                
                <div className="prose prose-sm max-w-none mb-4 text-gray-800">
                    <MarkdownRenderer content={currentTurn.feedback.explanation} />
                </div>

                <div className="bg-white/60 rounded-lg p-4 border border-black/5">
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-bold mb-1">Modelantwoord</p>
                    <MarkdownRenderer content={currentTurn.feedback.modelAnswer} />
                </div>

                <button 
                    onClick={handleNextQuestion}
                    className={`mt-6 w-full py-3 rounded-xl font-semibold shadow-sm text-white transition-all transform hover:scale-[1.01] active:scale-[0.99] ${subject.color}`}
                >
                    {sessionScore.total >= questionLimit ? 'Resultaten Bekijken 🏁' : 'Volgende Vraag →'}
                </button>
            </div>
        )}

        {/* Current Question Section */}
        {!showFeedback && currentTurn && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Opgave {sessionScore.total + 1}</span>
                    <div className="flex gap-2">
                        {currentTurn.nextQuestion.source && (
                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-bold">
                                {currentTurn.nextQuestion.source}
                            </span>
                        )}
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-medium truncate max-w-[150px]">
                            {currentTurn.nextQuestion.topic}
                        </span>
                    </div>
                </div>

                {/* ATTACHMENT SECTION */}
                {currentTurn.nextQuestion.attachment && (
                    <div className="p-6 md:p-8 pb-0">
                         {renderAttachment(currentTurn.nextQuestion.attachment)}
                    </div>
                )}

                <div className="p-6 md:p-8">
                    <div className="text-lg md:text-xl text-gray-800 leading-relaxed font-medium">
                        <MarkdownRenderer content={currentTurn.nextQuestion.text} />
                    </div>
                </div>

                 {/* HINT SECTION */}
                 <div className="px-6 md:px-8 pb-4">
                    {!showHint ? (
                        <button 
                            onClick={() => setShowHint(true)}
                            className="flex items-center gap-2 text-amber-600 font-medium bg-amber-50 px-3 py-2 rounded-lg hover:bg-amber-100 transition-colors text-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                            💡 Heb je een hint nodig?
                        </button>
                    ) : (
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl animate-fade-in">
                            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Hint</p>
                            <div className="text-amber-800 italic text-sm">
                                <MarkdownRenderer content={currentTurn.nextQuestion.hint} />
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="p-6 bg-gray-50 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Jouw antwoord</label>
                    <textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Typ je uitwerking en antwoord hier..."
                        className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 min-h-[150px] p-4 text-base"
                    />
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !userAnswer.trim()}
                            className={`px-6 py-3 rounded-xl font-semibold text-white shadow-md transition-all ${
                                isSubmitting || !userAnswer.trim() 
                                ? 'bg-gray-300 cursor-not-allowed' 
                                : `${subject.color} hover:brightness-110 active:transform active:scale-95`
                            }`}
                        >
                            {isSubmitting ? 'Nakijken...' : 'Controleren'}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default PracticeInterface;