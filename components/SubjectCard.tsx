import React from 'react';
import { Subject } from '../types';

interface SubjectCardProps {
  subject: Subject;
  onClick: (subject: Subject) => void;
}

const SubjectCard: React.FC<SubjectCardProps> = ({ subject, onClick }) => {
  return (
    <button
      onClick={() => onClick(subject)}
      className="flex flex-col items-start p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-indigo-100 group text-left w-full h-full"
    >
      <div className={`w-12 h-12 rounded-lg ${subject.color} flex items-center justify-center text-2xl mb-4 text-white shadow-md group-hover:scale-110 transition-transform`}>
        {subject.icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{subject.name}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{subject.description}</p>
    </button>
  );
};

export default SubjectCard;
