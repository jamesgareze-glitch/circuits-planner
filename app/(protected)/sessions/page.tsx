import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function SessionsPage() {
  const sessions = await prisma.session.findMany({
    orderBy: { date: "desc" },
    include: { _count: { select: { exercises: true, feedback: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <Link
          href="/sessions/new"
          className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
        >
          + New session
        </Link>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-zinc-500">No sessions yet — create your first one.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link href={`/sessions/${s.id}`} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {s.date.toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {s._count.exercises} exercises · {s.targetMinutes} min target
                    {s.attendanceCount !== null ? ` · ${s.attendanceCount} attended` : ""}
                  </p>
                </div>
                {s._count.feedback > 0 && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-200">
                    {s._count.feedback} feedback
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
