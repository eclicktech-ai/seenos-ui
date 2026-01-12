"use client";

import React from "react";
import { AlertTriangle, RefreshCw, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TurnResponse } from "@/types";
import { cn } from "@/lib/utils";

interface FailedMessageBannerProps {
  turn: TurnResponse;
  onRetry: (turnId: string) => void;
  onDismiss?: (turnId: string) => void;
  isRetrying: boolean;
  className?: string;
}

/**
 * FailedMessageBanner - Failed message retry banner
 * 
 * Based on WEBSOCKET_FRONTEND_GUIDE.md:
 * - Display error message and user input preview
 * - Support retry (show retryCount/maxRetries)
 * - Support dismiss (when max retries reached)
 */
export const FailedMessageBanner = React.memo<FailedMessageBannerProps>(
  ({ turn, onRetry, onDismiss, isRetrying, className }) => {
    // Format error code for display
    const formatErrorCode = (code: string | null): string => {
      if (!code) return "";
      return code
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
    };

    // Get hint message for error code
    const getErrorHint = (code: string | null): string | null => {
      switch (code) {
        case "rate_limit":
          return "Please try again later";
        case "api_timeout_error":
          return "Request timed out, try simplifying your question";
        case "context_overflow":
          return "Conversation too long, please start a new one";
        case "api_connection_error":
          return "Network connection issue, please check your network";
        default:
          return null;
      }
    };

    const errorHint = getErrorHint(turn.errorCode);

    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border p-3",
          turn.canRetry
            ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30"
            : "border-destructive/30 bg-destructive/10",
          className
        )}
      >
        {/* Icon */}
        <AlertTriangle
          className={cn(
            "mt-0.5 h-5 w-5 flex-shrink-0",
            turn.canRetry
              ? "text-amber-600 dark:text-amber-400"
              : "text-destructive"
          )}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Error Message */}
          <p
            className={cn(
              "text-sm font-medium",
              turn.canRetry
                ? "text-amber-800 dark:text-amber-200"
                : "text-destructive"
            )}
          >
            {turn.errorMessage || "Message failed to send"}
          </p>

          {/* Error Code */}
          {turn.errorCode && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Error type: {formatErrorCode(turn.errorCode)}
              {errorHint && <span className="ml-2 italic">({errorHint})</span>}
            </p>
          )}

          {/* User Input Preview */}
          {turn.userInputPreview && (
            <p className="text-xs text-muted-foreground mt-1.5 truncate">
              Message: "{turn.userInputPreview}"
            </p>
          )}

          {/* Partial Content */}
          {turn.partialContent && (
            <div className="mt-2 rounded-md bg-background/50 p-2">
              <p className="text-xs text-muted-foreground mb-1">Partial response:</p>
              <p className="text-xs line-clamp-2">{turn.partialContent}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {turn.canRetry ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRetry(turn.id)}
              disabled={isRetrying}
              className={cn(
                "h-8",
                "border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/50"
              )}
            >
              {isRetrying ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Retry ({turn.retryCount}/{turn.maxRetries})
                </>
              )}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Max retries reached
            </span>
          )}

          {/* Dismiss Button */}
          {onDismiss && !turn.canRetry && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDismiss(turn.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }
);
FailedMessageBanner.displayName = "FailedMessageBanner";

/**
 * FailedMessagesList - Failed messages list
 * 
 * Display multiple failed message retry banners
 */
interface FailedMessagesListProps {
  turns: TurnResponse[];
  onRetry: (turnId: string) => void;
  onDismiss?: (turnId: string) => void;
  retryingTurnId: string | null;
  className?: string;
}

export const FailedMessagesList = React.memo<FailedMessagesListProps>(
  ({ turns, onRetry, onDismiss, retryingTurnId, className }) => {
    if (turns.length === 0) {
      return null;
    }

    return (
      <div className={cn("space-y-2", className)}>
        {turns.map((turn) => (
          <FailedMessageBanner
            key={turn.id}
            turn={turn}
            onRetry={onRetry}
            onDismiss={onDismiss}
            isRetrying={retryingTurnId === turn.id}
          />
        ))}
      </div>
    );
  }
);
FailedMessagesList.displayName = "FailedMessagesList";

