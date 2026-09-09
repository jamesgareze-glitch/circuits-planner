import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/sessions";
  const hasError = params.error !== undefined;

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <form
        action={login}
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Circuits Planner
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Enter the passcode to continue.</p>

        <input type="hidden" name="next" value={next} />
        <input
          type="password"
          name="passcode"
          autoFocus
          required
          placeholder="Passcode"
          className="mt-6 w-full rounded-lg border border-zinc-300 px-3 py-2 text-base outline-none focus:border-green-600 dark:border-zinc-700 dark:bg-zinc-900"
        />

        {hasError && (
          <p className="mt-2 text-sm text-red-600">That passcode isn&apos;t right.</p>
        )}

        <button
          type="submit"
          className="mt-4 w-full rounded-lg bg-green-600 px-3 py-2 font-medium text-white hover:bg-green-700"
        >
          Enter
        </button>
      </form>
    </div>
  );
}
