import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  outboxAdd,
  outboxAll,
  outboxCount,
  outboxDelete,
  outboxUpdate,
  type OutboxOp,
} from "./offline-db";
import { toast } from "sonner";
import { QueryClient } from "@tanstack/react-query";

// ---------- pub/sub ----------
const listeners = new Set<() => void>();
let state = {
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  pendingCount: 0,
  syncing: false,
  lastError: undefined as string | undefined,
};

function notify() {
  for (const l of listeners) l();
}
function setState(partial: Partial<typeof state>) {
  state = { ...state, ...partial };
  notify();
}

async function refreshCount() {
  const c = await outboxCount();
  if (c !== state.pendingCount) setState({ pendingCount: c });
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    setState({ isOnline: true });
    void flush();
  });
  window.addEventListener("offline", () => setState({ isOnline: false }));
  // initial count
  void refreshCount();
  // periodic
  setInterval(() => {
    if (state.pendingCount > 0 && state.isOnline && !state.syncing) void flush();
  }, 60_000);
}

let queryClientRef: QueryClient | null = null;
export function bindQueryClient(qc: QueryClient) {
  queryClientRef = qc;
}

// ---------- API ----------
export async function enqueue(op: Omit<OutboxOp, "status" | "tries">) {
  const full: OutboxOp = { ...op, status: "pending", tries: 0 };
  await outboxAdd(full);
  await refreshCount();
}

export async function listPending(): Promise<OutboxOp[]> {
  return outboxAll();
}

export async function pendingCount(): Promise<number> {
  return outboxCount();
}

export async function retryFailed() {
  const all = await outboxAll();
  for (const op of all) {
    if (op.status === "failed") {
      await outboxUpdate({ ...op, status: "pending", lastError: undefined });
    }
  }
  await refreshCount();
  return flush();
}

function isNetworkError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message ?? err ?? "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    err.name === "TypeError"
  );
}

function isDuplicateError(err: any): boolean {
  return err && (err.code === "23505" || String(err.code) === "23505");
}

async function processNewProduct(op: OutboxOp): Promise<{ ok: boolean; retry?: boolean; err?: any }> {
  const { error } = await supabase
    .from("products")
    .upsert(op.payload, { onConflict: "id", ignoreDuplicates: true });
  if (!error || isDuplicateError(error)) return { ok: true };
  if (isNetworkError(error)) return { ok: false, retry: true, err: error };
  return { ok: false, retry: false, err: error };
}

async function processSale(op: OutboxOp): Promise<{ ok: boolean; retry?: boolean; err?: any }> {
  const { order, items, credit } = op.payload as {
    order: any;
    items: any[];
    credit?: { customerKind: "registered" | "pending"; customerId: string; txId: string; amount: number; note?: string | null };
  };

  // 1) order
  {
    const { error } = await supabase
      .from("orders")
      .upsert(order, { onConflict: "id", ignoreDuplicates: true });
    if (error && !isDuplicateError(error)) {
      if (isNetworkError(error)) return { ok: false, retry: true, err: error };
      return { ok: false, retry: false, err: error };
    }
  }

  // 2) items
  {
    const { error } = await supabase
      .from("order_items")
      .upsert(items, { onConflict: "id", ignoreDuplicates: true });
    if (error && !isDuplicateError(error)) {
      if (isNetworkError(error)) return { ok: false, retry: true, err: error };
      return { ok: false, retry: false, err: error };
    }
  }

  // 3) credit (registered only)
  if (credit && credit.customerKind === "registered") {
    // upsert account
    const accountRow = { customer_id: credit.customerId, store_id: order.store_id, balance: 0 };
    const upsertAcc = await supabase
      .from("credit_accounts")
      .upsert(accountRow, { onConflict: "customer_id,store_id", ignoreDuplicates: true });
    if (upsertAcc.error && !isDuplicateError(upsertAcc.error)) {
      if (isNetworkError(upsertAcc.error)) return { ok: false, retry: true, err: upsertAcc.error };
      return { ok: false, retry: false, err: upsertAcc.error };
    }
    const { data: acc, error: selErr } = await supabase
      .from("credit_accounts")
      .select("id")
      .eq("customer_id", credit.customerId)
      .eq("store_id", order.store_id)
      .maybeSingle();
    if (selErr) {
      if (isNetworkError(selErr)) return { ok: false, retry: true, err: selErr };
      return { ok: false, retry: false, err: selErr };
    }
    if (acc) {
      const tx = {
        id: credit.txId,
        account_id: acc.id,
        type: "charge",
        amount: credit.amount,
        order_id: order.id,
        note: credit.note ?? "بيع داخل المحل - أجل",
        status: "pending",
      };
      const { error: txErr } = await supabase
        .from("credit_transactions")
        .upsert(tx, { onConflict: "id", ignoreDuplicates: true });
      if (txErr && !isDuplicateError(txErr)) {
        if (isNetworkError(txErr)) return { ok: false, retry: true, err: txErr };
        return { ok: false, retry: false, err: txErr };
      }
    }
  }

  return { ok: true };
}

let flushing = false;
export async function flush(): Promise<{ success: number; failed: number }> {
  if (flushing) return { success: 0, failed: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) return { success: 0, failed: 0 };
  flushing = true;
  setState({ syncing: true, lastError: undefined });
  let success = 0;
  let failed = 0;
  try {
    const all = await outboxAll();
    // new_product first, then sale — but preserve FIFO within each
    const products = all.filter((o) => o.kind === "new_product" && o.status !== "failed");
    const sales = all.filter((o) => o.kind === "sale" && o.status !== "failed");
    const ordered = [...products, ...sales];

    for (const op of ordered) {
      const res =
        op.kind === "new_product" ? await processNewProduct(op) : await processSale(op);
      if (res.ok) {
        await outboxDelete(op.id);
        success += 1;
      } else if (res.retry) {
        // network — stop this round
        setState({ lastError: String(res.err?.message ?? res.err ?? "network") });
        break;
      } else {
        await outboxUpdate({
          ...op,
          status: "failed",
          tries: op.tries + 1,
          lastError: String(res.err?.message ?? res.err ?? "error"),
        });
        failed += 1;
      }
    }
  } finally {
    flushing = false;
    setState({ syncing: false });
    await refreshCount();
  }

  if (success > 0) {
    if (queryClientRef) {
      queryClientRef.invalidateQueries({ queryKey: ["reports-orders"] });
      queryClientRef.invalidateQueries({ queryKey: ["merchant-orders"] });
      queryClientRef.invalidateQueries({ queryKey: ["pos-products"] });
      queryClientRef.invalidateQueries({ queryKey: ["my-products"] });
      queryClientRef.invalidateQueries({ queryKey: ["merchant-credit"] });
    }
    toast.success(`تمت مزامنة ${success} فاتورة`);
  }
  return { success, failed };
}

// ---------- hook ----------
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function getSnapshot() {
  return state;
}
function getServerSnapshot() {
  return state;
}
export function usePosSync() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
