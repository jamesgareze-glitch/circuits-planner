import { Wizard } from "./Wizard";

export default function NewSessionPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">New session</h1>
      <Wizard />
    </div>
  );
}
