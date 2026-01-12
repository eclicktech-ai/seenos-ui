"use client";

import { useCallback, useState } from "react";
import { apiClient } from "@/lib/api/client";
import type {
  ImageAttachment,
  AttachmentRef,
  PresignedUploadResponse,
} from "@/app/types/types";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  AllowedImageType,
} from "@/app/types/types";

// ============ 类型定义 ============

export interface UseImageUploadOptions {
  maxImages?: number;           // 最大图片数量（默认 5）
  onError?: (error: string) => void;
}

export interface UseImageUploadReturn {
  attachments: ImageAttachment[];
  isUploading: boolean;
  hasErrors: boolean;
  hasPendingUploads: boolean;

  // 操作方法
  addImages: (files: FileList | File[]) => Promise<void>;
  removeImage: (id: string) => void;
  clearAll: () => void;
  retryUpload: (id: string) => Promise<void>;

  // 获取可发送的附件
  getReadyAttachments: () => AttachmentRef[];
}

// ============ 验证函数 ============

/**
 * 验证图片文件
 * @returns 错误信息，null 表示验证通过
 */
export function validateImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
    return `不支持的图片格式: ${file.type}。支持格式: PNG, JPEG, WebP, GIF`;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    return `图片大小超过限制: ${sizeMB}MB (最大 10MB)`;
  }
  return null;
}

// ============ 上传函数 ============

/**
 * 获取 Presigned URL
 */
async function getPresignedUploadUrl(
  filename: string,
  contentType: string
): Promise<PresignedUploadResponse> {
  return apiClient.getPresignedUploadUrl(filename, contentType);
}

/**
 * 上传文件到 S3（直接方式）
 */
async function uploadToS3(
  presigned: PresignedUploadResponse,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();

    // 添加所有 presigned fields（顺序重要！）
    Object.entries(presigned.fields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    // 文件必须最后添加
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(presigned.s3Key);
      } else {
        reject(new Error(`上传失败: HTTP ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("CORS_ERROR")); // 特殊标记，用于触发回退
    xhr.ontimeout = () => reject(new Error("上传超时"));

    xhr.open("POST", presigned.url);
    xhr.timeout = 120000; // 2 分钟超时
    xhr.send(formData);
  });
}

/**
 * 通过后端代理上传到 S3（解决 CORS 问题）
 */
async function uploadViaProxy(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ s3Key: string; publicUrl?: string; attachmentId?: string }> {
  const result = await apiClient.proxyUploadImage(file);
  // 代理上传完成时直接设置 100%
  onProgress?.(100);
  return {
    s3Key: result.s3Key,
    publicUrl: result.publicUrl,
    // 如果后端 proxyUploadImage 返回 attachmentId，也要支持
    attachmentId: (result as any).attachmentId
  };
}

// ============ Hook ============

export function useImageUpload(options: UseImageUploadOptions = {}): UseImageUploadReturn {
  const { maxImages = 5, onError } = options;

  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);

  // 计算属性
  const isUploading = attachments.some((a) => a.status === "uploading");
  const hasErrors = attachments.some((a) => a.status === "error");
  const hasPendingUploads = attachments.some((a) => a.status === "uploading");

  // 更新单个附件状态
  const updateAttachment = useCallback(
    (id: string, updates: Partial<ImageAttachment>) => {
      setAttachments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      );
    },
    []
  );

  // 上传单个图片（支持自动回退到 Proxy Upload）
  const uploadImage = useCallback(
    async (attachment: ImageAttachment) => {
      try {
        let s3Key: string;

        try {
          // 尝试方式 1: Presigned URL 直接上传到 S3（推荐）
          console.log("[useImageUpload] Getting presigned URL for:", attachment.file.name);

          const presigned = await getPresignedUploadUrl(
            attachment.file.name,
            attachment.file.type
          );

          console.log("[useImageUpload] Got presigned URL, uploading to S3...");

          s3Key = await uploadToS3(presigned, attachment.file, (progress) => {
            updateAttachment(attachment.id, { progress });
          });

          // 更新附件 ID 和 Public URL (从服务端获取)
          if (presigned.attachmentId || presigned.publicUrl) {
            updateAttachment(attachment.id, {
              attachmentId: presigned.attachmentId,
              publicUrl: presigned.publicUrl
            });
          }

          console.log("[useImageUpload] Direct S3 upload complete, s3Key:", s3Key);
        } catch (directError) {
          // 如果是 CORS 错误或网络错误，回退到 Proxy Upload
          const errorMessage = directError instanceof Error ? directError.message : "";
          if (errorMessage === "CORS_ERROR" || errorMessage.includes("网络")) {
            console.warn("[useImageUpload] Direct S3 upload failed (CORS), falling back to proxy upload");

            const proxyResult = await uploadViaProxy(attachment.file, (progress) => {
              updateAttachment(attachment.id, { progress });
            });
            s3Key = proxyResult.s3Key;

            // 更新附件 ID 和 Public URL (从 Proxy 获取)
            if (proxyResult.attachmentId || proxyResult.publicUrl) {
              updateAttachment(attachment.id, {
                attachmentId: proxyResult.attachmentId,
                publicUrl: proxyResult.publicUrl
              });
            }

            console.log("[useImageUpload] Proxy upload complete, s3Key:", s3Key);
          } else {
            // 其他错误，直接抛出
            throw directError;
          }
        }

        // 更新状态为 ready
        updateAttachment(attachment.id, {
          status: "ready",
          s3Key,
          progress: 100,
        });
      } catch (error) {
        console.error("[useImageUpload] Upload failed:", error);

        // 提取更详细的错误信息
        let errorMessage = "上传失败";
        if (error instanceof Error) {
          errorMessage = error.message;
          // 如果是 API 错误，尝试获取更多信息
          const apiError = error as { code?: string; status?: number };
          if (apiError.status === 404) {
            errorMessage = "上传接口不存在，请检查后端服务";
          } else if (apiError.status === 401) {
            errorMessage = "未授权，请重新登录";
          } else if (apiError.status === 413) {
            errorMessage = "文件太大";
          }
        }

        updateAttachment(attachment.id, {
          status: "error",
          error: errorMessage,
        });
        onError?.(errorMessage);
      }
    },
    [updateAttachment, onError]
  );

  // 添加图片
  const addImages = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      // 检查数量限制
      const currentCount = attachments.length;
      const remainingSlots = maxImages - currentCount;
      if (remainingSlots <= 0) {
        onError?.(`最多只能上传 ${maxImages} 张图片`);
        return;
      }

      const filesToAdd = fileArray.slice(0, remainingSlots);
      if (filesToAdd.length < fileArray.length) {
        onError?.(`已达到上传限制，只添加了 ${filesToAdd.length} 张图片`);
      }

      // 验证并创建附件
      const newAttachments: ImageAttachment[] = [];
      for (const file of filesToAdd) {
        const validationError = validateImage(file);
        if (validationError) {
          onError?.(validationError);
          continue;
        }

        const id = crypto.randomUUID();
        const preview = URL.createObjectURL(file);

        const attachment: ImageAttachment = {
          id,
          file,
          preview,
          status: "uploading",
          progress: 0,
        };

        newAttachments.push(attachment);
      }

      if (newAttachments.length === 0) return;

      // 添加到状态
      setAttachments((prev) => [...prev, ...newAttachments]);

      // 开始上传（并行）
      await Promise.all(newAttachments.map(uploadImage));
    },
    [attachments.length, maxImages, onError, uploadImage]
  );

  // 移除图片
  const removeImage = useCallback((id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment) {
        // 释放 Object URL
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // 清空所有
  const clearAll = useCallback(() => {
    // 释放所有 Object URL
    attachments.forEach((a) => URL.revokeObjectURL(a.preview));
    setAttachments([]);
  }, [attachments]);

  // 重试上传
  const retryUpload = useCallback(
    async (id: string) => {
      const attachment = attachments.find((a) => a.id === id);
      if (!attachment || attachment.status !== "error") return;

      // 重置状态
      updateAttachment(id, {
        status: "uploading",
        progress: 0,
        error: undefined,
      });

      // 重新上传
      await uploadImage(attachment);
    },
    [attachments, updateAttachment, uploadImage]
  );

  // 获取已准备好的附件（用于发送消息）
  // 返回的 AttachmentRef: 优先使用 publicUrl，其次使用 preview (Blob URL)
  const getReadyAttachments = useCallback((): AttachmentRef[] => {
    return attachments
      .filter((a) => a.status === "ready" && a.s3Key)
      .map((a) => ({
        type: "image" as const,
        s3Key: a.s3Key!,
        mimeType: a.file.type,
        purpose: "reference_image" as const,
        previewUrl: a.publicUrl || a.preview, // 优先使用 Public URL，避免 Blob URL 被 revoke 导致无法显示
        attachmentId: a.attachmentId,
      }));
  }, [attachments]);

  return {
    attachments,
    isUploading,
    hasErrors,
    hasPendingUploads,
    addImages,
    removeImage,
    clearAll,
    retryUpload,
    getReadyAttachments,
  };
}

export type { ImageAttachment, AttachmentRef };
