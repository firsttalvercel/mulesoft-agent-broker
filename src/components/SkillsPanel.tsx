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
        <p className="text-sm font-semibold text-gray-600 mb-1">No skills found</p>
        <p className="text-sm text-gray-400 leading-relaxed">
          The broker did not return any skills. Check the Settings tab for connection details.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
        {skills.length} skill{skills.length !== 1 ? 's' : ''} available
      </p>

      <div className="space-y-4">
        {skills.map((skill) => {
          const linkedAgent = agents.find((a) => a.id === `skill-${skill.id}`);

          return (
            <div key={skill.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-[15px] font-semibold text-gray-900 leading-snug">{skill.name}</p>
                {linkedAgent && (
                  <span className="shrink-0 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 leading-tight whitespace-nowrap">
                    {linkedAgent.name}
                  </span>
                )}
              </div>

              {skill.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{skill.description}</p>
              )}

              {skill.tags && skill.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {skill.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {skill.examples && skill.examples.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Example</p>
                  <p className="text-sm text-gray-500 italic leading-relaxed">"{skill.examples[0]}"</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
