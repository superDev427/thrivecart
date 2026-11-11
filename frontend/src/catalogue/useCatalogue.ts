import { useEffect, useState } from 'react';
import { describeError, fetchCatalogue } from '../api/client';
import type { Catalogue } from '../api/types';

export type CatalogueState =
  | { status: 'loading' }
  | { status: 'ready'; catalogue: Catalogue }
  | { status: 'failed'; message: string };

type CatalogueResult = {
  attempt: number;
  state: CatalogueState;
};

const loadingState: CatalogueState = { status: 'loading' };

export function useCatalogue() {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<CatalogueResult | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchCatalogue(controller.signal).then(
      (catalogue) => {
        if (!controller.signal.aborted) {
          setResult({ attempt, state: { status: 'ready', catalogue } });
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({ attempt, state: { status: 'failed', message: describeError(error) } });
        }
      },
    );

    return () => controller.abort();
  }, [attempt]);

  return {
    state: result?.attempt === attempt ? result.state : loadingState,
    retry: () => setAttempt((current) => current + 1),
  };
}
