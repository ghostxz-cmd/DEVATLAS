'use client';

import { useMemo, useState } from 'react';

interface LaboratorManagerProps {
  moduleId: string;
  courseId: string;
  accessToken?: string;
}

export default function LaboratorManager({ moduleId, courseId, accessToken }: LaboratorManagerProps) {
  const [activeType, setActiveType] = useState<'CODING' | 'DRAWING' | 'EXPERIMENTAL'>('CODING');

  const items = useMemo(
    () => [
      {
        type: 'CODING',
        title: 'Coding Labs',
        description: 'Template cod, validări și testare automată pentru exerciții practice.',
      },
      {
        type: 'DRAWING',
        title: 'Drawing Labs',
        description: 'Spațiu pentru diagrame, schițe și evaluare vizuală.',
      },
      {
        type: 'EXPERIMENTAL',
        title: 'Experimental Labs',
        description: 'Simulări și scenarii interactive pentru învățare aplicată.',
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Laborator și Exerciții Practice</h2>
          <p className="text-sm text-slate-400">{activeType === 'CODING' ? 'Coding' : activeType === 'DRAWING' ? 'Drawing' : 'Experimental'} labs pentru modulul curent</p>
        </div>
        <button className="rounded-lg bg-cyan-500 px-4 py-2 text-white transition hover:bg-cyan-600">
          + Creare Laborator
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => setActiveType(item.type as 'CODING' | 'DRAWING' | 'EXPERIMENTAL')}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              activeType === item.type
                ? 'border-cyan-400/60 bg-cyan-500 text-white'
                : 'border-cyan-400/20 bg-[#070b14] text-slate-300 hover:text-white'
            }`}
          >
            {item.title}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.type} className="rounded-lg border border-cyan-400/20 bg-[#070b14] p-4">
            <p className="text-sm font-semibold text-cyan-400">{item.title}</p>
            <p className="mt-2 text-xs text-slate-400">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
