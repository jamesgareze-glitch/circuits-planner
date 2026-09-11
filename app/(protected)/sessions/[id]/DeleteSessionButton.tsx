"use client";

export function DeleteSessionButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm(`Delete "${label}"? This can't be undone.`)) {
          e.preventDefault();
        }
      }}
      className="text-sm text-red-600 hover:underline"
    >
      Delete session
    </button>
  );
}
