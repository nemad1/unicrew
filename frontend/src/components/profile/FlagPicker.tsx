"use client";

// A small set of common origin countries for this app's student population,
// clickable to append (not replace) — supports mixed-heritage users building
// a multi-flag string like "🇪🇬🇸🇦". The text input still accepts any pasted
// emoji directly, since origin_flag is unconstrained TEXT.
const COMMON_FLAGS = [
  "🇲🇾", "🇸🇬", "🇮🇩", "🇹🇭", "🇻🇳", "🇵🇭", "🇮🇳", "🇵🇰", "🇧🇩", "🇨🇳",
  "🇭🇰", "🇹🇼", "🇯🇵", "🇰🇷", "🇪🇬", "🇳🇬", "🇰🇪", "🇿🇦", "🇸🇦", "🇦🇪",
  "🇬🇧", "🇺🇸", "🇨🇦", "🇦🇺", "🇳🇿", "🇫🇷", "🇩🇪", "🇮🇹", "🇪🇸", "🇧🇷",
];

export function FlagPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. 🇪🇬🇸🇦 — tap flags below or paste your own"
        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-400"
      />
      <div className="flex flex-wrap gap-1.5">
        {COMMON_FLAGS.map((flag) => (
          <button
            key={flag}
            type="button"
            onClick={() => onChange(value + flag)}
            className="w-8 h-8 flex items-center justify-center text-base rounded-md border border-gray-200 hover:bg-gray-50"
          >
            {flag}
          </button>
        ))}
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-gray-400 hover:text-red-600 px-2"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
