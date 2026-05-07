"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { get, set, del, createStore, type UseStore } from "idb-keyval";

// Phase 3: Aggressive cache reuse so repeated mounts and offline navigation
// don't trigger fresh Firestore reads.
const STALE_TIME = 5 * 60 * 1000;   // 5 minutes
const GC_TIME = 10 * 60 * 1000;     // 10 minutes (cache retention in memory)
const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000; // 24h on disk

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
        retry: 2,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
    },
  });
}

// IndexedDB-backed persister using idb-keyval (no extra runtime).
let idbStore: UseStore | null = null;
function getStore(): UseStore {
  if (!idbStore) idbStore = createStore("rq-cache", "v1");
  return idbStore;
}

const PERSIST_KEY = "react-query-cache";

function makeIdbPersister() {
  return {
    persistClient: async (client: any) => {
      try { await set(PERSIST_KEY, client, getStore()); } catch {}
    },
    restoreClient: async () => {
      try { return (await get(PERSIST_KEY, getStore())) as any; } catch { return undefined; }
    },
    removeClient: async () => {
      try { await del(PERSIST_KEY, getStore()); } catch {}
    },
  };
}

let browserQueryClient: QueryClient | undefined;
function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function ReactQueryClientProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(getQueryClient);

  // SSR fallback: bare provider, no IndexedDB.
  if (typeof window === "undefined") {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister: makeIdbPersister() as any,
        maxAge: PERSIST_MAX_AGE,
        buster: "v1",
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
