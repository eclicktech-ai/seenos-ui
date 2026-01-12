"use client";

import { useState, useCallback, useEffect } from "react";
import { apiClient } from "@/lib/api/client";
import type { TurnResponse, FailedTurnsResponse } from "@/types";

interface UseMessageRetryOptions {
  cid: string | null;
  /** Whether to enable (default true) */
  enabled?: boolean;
  /** Retry callback (provided by useStream) */
  onRetry?: (turnId: string) => Promise<void>;
  /** Error callback */
  onError?: (error: Error) => void;
}

/**
 * useMessageRetry - Message retry Hook
 * 
 * Based on WEBSOCKET_FRONTEND_GUIDE.md:
 * - Get failed turns list
 * - Support retry failed messages (max 3 times)
 * - Track retry status
 */
export function useMessageRetry({
  cid,
  enabled = true,
  onRetry,
  onError,
}: UseMessageRetryOptions) {
  const [failedTurns, setFailedTurns] = useState<TurnResponse[]>([]);
  const [retryableCount, setRetryableCount] = useState(0);
  const [retryingTurnId, setRetryingTurnId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch failed turns
  const fetchFailedTurns = useCallback(async () => {
    if (!cid || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<FailedTurnsResponse>(
        `/sessions/turns/conversation/${cid}/failed?retryable_only=true`
      );

      setFailedTurns(response.turns || []);
      setRetryableCount(response.retryableCount || 0);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch failed turns");
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [cid, enabled, onError]);

  // Retry message
  const retryMessage = useCallback(async (turnId: string) => {
    if (!onRetry) {
      throw new Error("onRetry callback is required");
    }

    // Check if can retry
    const turn = failedTurns.find(t => t.id === turnId);
    if (turn && !turn.canRetry) {
      throw new Error("Maximum retry attempts reached");
    }

    setRetryingTurnId(turnId);
    setError(null);

    try {
      await onRetry(turnId);
      // Refresh list after successful retry
      await fetchFailedTurns();
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to retry message");
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setRetryingTurnId(null);
    }
  }, [onRetry, failedTurns, fetchFailedTurns, onError]);

  // Check if can retry
  const canRetry = useCallback((turnId: string): boolean => {
    const turn = failedTurns.find(t => t.id === turnId);
    return turn?.canRetry ?? false;
  }, [failedTurns]);

  // Initial load and refresh when cid changes
  useEffect(() => {
    if (cid && enabled) {
      fetchFailedTurns();
    } else {
      // Clear state
      setFailedTurns([]);
      setRetryableCount(0);
    }
  }, [cid, enabled, fetchFailedTurns]);

  return {
    failedTurns,
    retryableCount,
    retryingTurnId,
    isLoading,
    error,
    retryMessage,
    refreshFailedTurns: fetchFailedTurns,
    canRetry,
  };
}

export type UseMessageRetryReturn = ReturnType<typeof useMessageRetry>;

