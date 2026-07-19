export function HashtagList({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag, i) => (
        <span
          key={i}
          className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded-md text-gray-600"
        >
          #{tag.replace(/^#/, "")}
        </span>
      ))}
    </div>
  );
}
