import { BookOpen, Edit3 } from 'lucide-react';
import { useViewMode } from '../../contexts/ViewModeContext';

export function ModeToggle() {
  const { mode, toggleMode } = useViewMode();

  const isDiaryMode = mode === 'diary';

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Mode:</span>
      <button
        onClick={toggleMode}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg
          transition-all duration-200 text-sm font-medium
          ${isDiaryMode
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          }
        `}
        title={isDiaryMode ? 'Switch to Edit mode' : 'Switch to Diary mode'}
      >
        {isDiaryMode ? (
          <>
            <BookOpen size={16} />
            <span>Diary</span>
          </>
        ) : (
          <>
            <Edit3 size={16} />
            <span>Edit</span>
          </>
        )}
      </button>
      {!isDiaryMode && (
        <span className="text-xs text-gray-500">
          Hover nodes to connect
        </span>
      )}
    </div>
  );
}
