'use client';

import { useAppStore } from '@/store';

export function SkillsPanel() {
  const skills = useAppStore((s) => s.skills);
  const agents = useAppStore((s) => s.agents);

  if (skills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.091z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-600">No skills available</p>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
          Connect a broker that exposes skills to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-3">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
        {skills.length} skill{skills.length !== 1 ? 's' : ''}
      </p>

      <div className="space-y-3">
        {skills.map((skill) => {
          const linkedAgent = agents.find((a) => a.id === `skill-${skill.id}`);

          return (
            <div key={skill.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3.5">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-sm font-semibold text-gray-900 leading-tight">{skill.name}</p>
                {linkedAgent && (
                  <span className="shrink-0 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 leading-tight">
                    {linkedAgent.name}
                  </span>
                )}
              </div>

              {skill.description && (
                <p className="text-xs text-gray-500 leading-relaxed">{skill.description}</p>
              )}

              {skill.tags && skill.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {skill.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] text-gray-400 bg-white border border-gray-200 rounded-full px-2 py-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {skill.examples && skill.examples.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Example</p>
                  <p className="text-xs text-gray-500 italic">"{skill.examples[0]}"</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
