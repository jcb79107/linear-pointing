import { PointedMark } from "@/components/Brand";

export default function Loading() {
  return (
    <main className="brand-loading" aria-label="Loading Pointed">
      <PointedMark size={36} />
      <span>Loading Pointed…</span>
    </main>
  );
}
