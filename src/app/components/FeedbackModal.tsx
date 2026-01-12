"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { FeedbackType } from "@/lib/api/client";

interface FeedbackModalProps {
  /** 是否打开弹窗 */
  isOpen: boolean;
  /** 反馈类型 */
  type: FeedbackType | null;
  /** 默认原因（编辑已有反馈时） */
  defaultReason?: string;
  /** 关闭弹窗 */
  onClose: () => void;
  /** 提交反馈 */
  onSubmit: (reason: string) => Promise<void>;
  /** 是否正在提交 */
  isSubmitting?: boolean;
}

/**
 * FeedbackModal - 反馈原因填写弹窗
 * 
 * 基于 FEEDBACK_API_FRONTEND_GUIDE.md 实现：
 * - 点击后必须填写原因才能提交
 * - 最多 1000 字符
 * - 显示提交状态
 */
export function FeedbackModal({
  isOpen,
  type,
  defaultReason = "",
  onClose,
  onSubmit,
  isSubmitting = false,
}: FeedbackModalProps) {
  const [reason, setReason] = useState(defaultReason);
  const [error, setError] = useState<string | null>(null);

  // 弹窗打开时重置状态
  useEffect(() => {
    if (isOpen) {
      setReason(defaultReason);
      setError(null);
    }
  }, [isOpen, defaultReason]);

  const handleSubmit = async () => {
    // Validate reason
    if (!reason.trim()) {
      setError("Please provide a reason");
      return;
    }

    if (reason.length > 1000) {
      setError("Reason cannot exceed 1000 characters");
      return;
    }

    setError(null);

    try {
      await onSubmit(reason.trim());
      // Clear and close on success
      setReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed, please try again");
    }
  };

  const title = type === "like" ? "👍 Like this response" : "👎 Dislike this response";
  const placeholder =
    type === "like"
      ? "Tell us why you found this response helpful..."
      : "Tell us what could be improved...";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={placeholder}
              className="min-h-[100px] resize-none"
              maxLength={1000}
              disabled={isSubmitting}
            />
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {error && <span className="text-destructive">{error}</span>}
              </span>
              <span>{reason.length}/1000</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FeedbackModal;
