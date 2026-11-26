import { useEffect, useState } from "react";
import { friendly } from "../lib/supabase";
import { Spinner } from "../components/ui";

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-[30px] sm:text-[36px]">{title}</h1>
      {children}
    </div>
  );
}

export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    setError(null);
    fn().then((d) => live && setData(d)).catch((e) => live && setError(friendly(e)));
    return () => {
      live = false;
    };
  }, [n, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, error, reload: () => setN((x) => x + 1), setData };
}

export function Loading({ error }: { error?: string | null }) {
  return error ? <p className="rounded-2xl bg-blush/50 p-4 text-[14.5px]" role="alert">{error}</p> : <div className="grid h-40 place-items-center"><Spinner className="size-7 text-cocoa" /></div>;
}
