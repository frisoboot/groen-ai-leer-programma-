import React, { useState, useRef, useEffect } from 'react';
import { Message, Role, Subject, UserProfile } from '../types';
import { generateResponseStream } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatInterfaceProps {
  subject: Subject;
  profile: UserProfile;
  onBack: () => void;
  onHome: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ subject, profile, onBack, onHome }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: Role.MODEL,
      text: `Hoi ${profile.name}! Ik ben je ${subject.name} tutor voor ${profile.level.toUpperCase()} ${profile.year}. Waar kan ik je mee helpen?`,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // REMOVED: Automatic scroll useEffect on [messages].
  // User now controls scrolling manually.

  // Auto-resize textarea logic
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputText]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && !selectedImage) || isStreaming) return;

    const userMessageText = inputText;
    const currentImage = imagePreview;
    
    setInputText('');
    clearImage();
    
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }
    
    const newMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text: userMessageText,
      timestamp: new Date(),
      imageUrl: currentImage || undefined,
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    
    // Only scroll once when user sends a message so they see what they sent.
    // We do NOT scroll during streaming.
    setTimeout(() => scrollToBottom(), 100);

    setIsStreaming(true);

    try {
        let base64Image = undefined;
        let mimeType = undefined;

        if (currentImage) {
            base64Image = currentImage.split(',')[1];
            mimeType = currentImage.split(':')[1].split(';')[0];
        }

        const stream = await generateResponseStream(
            updatedMessages,
            userMessageText || (currentImage ? "Analyseer deze afbeelding." : ""),
            subject,
            profile,
            base64Image,
            mimeType
        );

        const botMessageId = (Date.now() + 1).toString();
        setMessages(prev => [
            ...prev,
            {
                id: botMessageId,
                role: Role.MODEL,
                text: '',
                timestamp: new Date(),
                isStreaming: true
            }
        ]);

        let fullText = '';
        
        for await (const chunk of stream) {
            fullText += chunk;
            setMessages(prev => 
                prev.map(msg => 
                    msg.id === botMessageId 
                        ? { ...msg, text: fullText } 
                        : msg
                )
            );
        }

        setMessages(prev => 
            prev.map(msg => 
                msg.id === botMessageId 
                    ? { ...msg, isStreaming: false } 
                    : msg
            )
        );

    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: Role.MODEL,
          text: "Sorry, er ging iets mis bij het verbinden met de AI. Probeer het later opnieuw.",
          timestamp: new Date(),
        }
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    // FULL SCREEN CONTAINER with 100dvh for better mobile support
    <div className="flex flex-col h-[100dvh] bg-gray-50">
      
      {/* HEADER: Full width */}
      <div className={`${subject.color} px-4 py-3 text-white shadow-md z-10 shrink-0`}>
        <div className="w-full flex items-center justify-between">
            <button 
                onClick={onBack} 
                className="flex items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white"
                title="Terug"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>
            
            <div className="flex flex-col items-center">
                <h2 className="text-lg font-bold flex items-center gap-2">
                <span>{subject.icon}</span> {subject.name}
                </h2>
                <div className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">
                    Tutor
                </div>
            </div>

            <button 
                onClick={onHome} 
                className="flex items-center gap-1 px-3 py-1.5 hover:bg-white/20 rounded-lg transition-colors text-sm font-medium"
                title="Naar vakkenoverzicht"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="hidden sm:inline">Home</span>
            </button>
        </div>
      </div>

      {/* MESSAGES AREA: Centered content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 w-full">
          <div className="max-w-4xl mx-auto p-4 space-y-6">
            {messages.map((msg) => (
                <div
                key={msg.id}
                className={`flex ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}
                >
                <div
                    className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-sm ${
                    msg.role === Role.USER
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                    }`}
                >
                    {msg.imageUrl && (
                    <div className="mb-3">
                        <img src={msg.imageUrl} alt="Uploaded context" className="rounded-lg max-h-60 object-contain bg-black/10" />
                    </div>
                    )}
                    {msg.role === Role.MODEL ? (
                    <MarkdownRenderer content={msg.text} />
                    ) : (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                </div>
                </div>
            ))}
            {isStreaming && messages[messages.length - 1]?.role === Role.USER && (
                <div className="flex justify-start">
                    <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm border border-gray-100 flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
      </div>

      {/* INPUT AREA: Full width bar, centered content */}
      <div className="bg-white border-t border-gray-100 shrink-0 w-full safe-area-bottom">
        <div className="max-w-4xl mx-auto p-4">
            {imagePreview && (
                <div className="flex items-center gap-2 mb-3 bg-gray-50 p-2 rounded-lg border border-gray-200 w-fit">
                    <img src={imagePreview} alt="Preview" className="h-12 w-12 object-cover rounded" />
                    <span className="text-xs text-gray-500 truncate max-w-[150px]">{selectedImage?.name}</span>
                    <button onClick={clearImage} className="text-gray-400 hover:text-red-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}
            <div className="flex items-end gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageSelect}
                />
                <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors mb-0.5"
                title="Upload afbeelding"
                >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                </button>
                
                <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Typ je vraag..."
                className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 py-2.5 text-gray-700 leading-relaxed scrollbar-hide"
                rows={1}
                style={{ minHeight: '44px' }}
                />
                
                <button
                onClick={handleSendMessage}
                disabled={(!inputText.trim() && !selectedImage) || isStreaming}
                className={`p-2 rounded-xl transition-all mb-0.5 ${
                    (!inputText.trim() && !selectedImage) || isStreaming
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                }`}
                >
                <svg className="w-6 h-6 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;