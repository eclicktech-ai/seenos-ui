# Artifacts 图片和 DOCX 无法显示问题修复说明

## 问题描述

在历史消息加载时，artifacts 中的图片和 docx 文件无法正确显示。具体表现为：
- 图片显示"图片加载中..."占位符
- DOCX 文件无法下载或预览

## 根本原因

### 1. `buildContentBlocksFromMessage()` 函数缺少附件处理

**位置**: `src/hooks/useStream.ts` 第 163-214 行

**问题**: 该函数在重建历史消息的 `contentBlocks` 时，只处理了：
- ✅ 工具调用块（ToolCallBlock）
- ✅ 文本块（TextBlock）

但**缺少**了：
- ❌ **附件块（AttachmentRefBlock）** 的处理

### 2. 数据流问题

```
后端返回历史消息
  ↓
message.contentBlocks = [] 或 undefined
  ↓
前端调用 buildContentBlocksFromMessage() 重建
  ↓
只构建 ToolCallBlock + TextBlock
  ↓
❌ AttachmentRefBlock 丢失
  ↓
AttachmentRefBlockView 收不到 previewUrl
  ↓
无法显示图片 / 无法下载文档
```

### 3. 对比：新消息 vs 历史消息

| 场景 | 附件处理 | 结果 |
|------|---------|------|
| 新消息发送 (`ADD_USER_MESSAGE`) | ✅ 正确从 `action.attachments` 构建 `AttachmentRefBlock` | ✅ 正常显示 |
| 历史消息加载 (`SET_INITIAL_STATE`/`PREPEND_MESSAGES`) | ❌ `buildContentBlocksFromMessage()` 不处理附件 | ❌ 无法显示 |

## 修复方案

### 修改 1: 增强 `buildContentBlocksFromMessage()` 函数

**文件**: `src/hooks/useStream.ts`

**改动**:
1. 修改函数签名，支持 `MessageContent[]` 数组格式
2. 添加附件处理逻辑，支持两种格式：
   - **图片**: `{ type: 'image_url', image_url: { url: '...' } }`
   - **文档**: `{ type: 'file', file_url: { url: '...' }, mime_type: '...' }`
3. 从 `message.content` 数组中提取附件并转换为 `AttachmentRefBlock`
4. 设置 `previewUrl` 字段（**关键**）

**关键代码**:
```typescript
// 处理 image_url 类型的附件
if (item.type === 'image_url' && item.image_url?.url) {
  const attachmentBlock: AttachmentRefBlock = {
    id: `attachment-${msgId}-${idx}`,
    type: 'attachment_ref',
    attachmentId: item.image_url.url,
    attachmentType: 'image',
    mimeType: 'image/jpeg',
    previewUrl: item.image_url.url, // ⭐ 关键：设置 previewUrl
  };
  blocks.push(attachmentBlock);
}

// 处理文档类型的附件（docx、pdf 等）
else if (item.type === 'file' && fileItem.file_url?.url) {
  const attachmentBlock: AttachmentRefBlock = {
    id: `attachment-${msgId}-${idx}`,
    type: 'attachment_ref',
    attachmentId: url,
    attachmentType: getAttachmentType(mimeType), // 自动识别类型
    mimeType: mimeType,
    filename: fileItem.filename,
    previewUrl: url, // ⭐ 关键：设置 previewUrl
  };
  blocks.push(attachmentBlock);
}
```

### 修改 2: 添加 `MessageContent` 类型导入

**文件**: `src/hooks/useStream.ts`

**改动**: 在导入语句中添加 `MessageContent` 类型

### 修改 3: 增强 `AttachmentRefBlockView` 回退逻辑

**文件**: `src/app/components/ContentBlocks/AttachmentRefBlockView.tsx`

**改动**: 添加回退逻辑，当 `previewUrl` 为空时，尝试使用 `attachmentId` 作为 URL

**关键代码**:
```typescript
// ⭐ 修复：如果没有 previewUrl，尝试使用 attachmentId 构建 URL
const effectivePreviewUrl = previewUrl || (
  attachmentId && (attachmentId.startsWith('http://') || attachmentId.startsWith('https://'))
    ? attachmentId
    : undefined
);
```

## 支持的附件格式

修复后支持以下附件格式：

### 1. 图片 (`image_url` 格式)
```json
{
  "type": "image_url",
  "image_url": {
    "url": "https://example.com/image.jpg"
  }
}
```

### 2. 文档 (`file` 格式)
```json
{
  "type": "file",
  "file_url": {
    "url": "https://example.com/document.docx"
  },
  "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "filename": "document.docx"
}
```

### 支持的文件类型

| MIME Type 关键词 | 附件类型 |
|-----------------|---------|
| `image/` | `image` |
| `audio/` | `audio` |
| `video/` | `video` |
| `pdf`, `document`, `word`, `text` | `document` |
| `json`, `csv`, `xml`, `spreadsheet`, `excel` | `data` |
| 其他 | `other` |

## 测试验证

### 测试场景

1. **新消息上传图片/文档**
   - ✅ 应该正常显示（已有功能）

2. **刷新页面后查看历史消息**
   - ✅ 图片应该正常显示（修复后）
   - ✅ DOCX 文件应该可以下载（修复后）

3. **分页加载旧消息**
   - ✅ 附件应该正常显示（修复后）

### 验证步骤

1. 发送包含图片的消息
2. 发送包含 DOCX 文件的消息
3. 刷新页面
4. 检查图片是否正常显示
5. 检查 DOCX 是否可以下载
6. 滚动到顶部触发分页加载
7. 检查旧消息中的附件是否正常

## 潜在问题和注意事项

### 1. Object URL 的生命周期

对于新发送的消息，`previewUrl` 是本地的 Object URL（如 `blob:...`）：
- ✅ **新消息**: Object URL 在内存中，可以立即显示
- ❌ **历史消息**: 刷新后 Object URL 失效

**解决方案**: 后端应该返回持久化的 URL（S3 公开链接或签名 URL）

### 2. 后端数据格式要求

修复后，前端能够正确处理后端返回的附件数据，但**前提是**后端需要：

1. 在历史消息的 `message.content` 数组中包含附件信息：
   ```json
   {
     "content": [
       {
         "type": "text",
         "text": "这是消息文本"
       },
       {
         "type": "image_url",
         "image_url": {
           "url": "https://s3.amazonaws.com/bucket/image.jpg"
         }
       }
     ]
   }
   ```

2. 或者在 `message.contentBlocks` 中直接提供 `AttachmentRefBlock`：
   ```json
   {
     "contentBlocks": [
       {
         "id": "...",
         "type": "attachment_ref",
         "attachmentId": "...",
         "attachmentType": "image",
         "mimeType": "image/jpeg",
         "previewUrl": "https://s3.amazonaws.com/bucket/image.jpg"
       }
     ]
   }
   ```

### 3. MIME Type 识别

如果后端不提供 `mime_type`，前端会使用默认值：
- 图片: `image/jpeg`
- 文档: `application/octet-stream`

**建议**: 后端应该提供准确的 MIME type

## 后续优化建议

1. **添加 S3 URL 构建逻辑**
   - 如果后端只返回 S3 key，前端可以根据环境变量构建完整 URL

2. **添加附件缓存**
   - 将附件 URL 缓存到 localStorage，避免重复请求

3. **改进错误处理**
   - 当 URL 失效时，显示更友好的错误信息
   - 提供重新上传或刷新的选项

4. **支持更多附件类型**
   - 视频预览
   - 音频播放器
   - PDF 内嵌预览

## 相关文件

- `src/hooks/useStream.ts` - 消息处理和 contentBlocks 构建
- `src/app/components/ContentBlocks/AttachmentRefBlockView.tsx` - 附件渲染组件
- `src/app/components/ContentBlocks/index.tsx` - ContentBlocks 渲染器
- `src/app/types/types.ts` - 类型定义

## 提交信息建议

```
fix: 修复历史消息中图片和文档无法显示的问题

- 增强 buildContentBlocksFromMessage() 函数，支持从 message.content 数组中提取附件
- 添加 image_url 和 file 格式的附件处理逻辑
- 修复 AttachmentRefBlockView 组件，支持使用 attachmentId 作为回退 URL
- 确保 previewUrl 在重建 contentBlocks 时正确设置

修复后，历史消息中的图片和 DOCX 文件可以正常显示和下载。

影响范围：
- 历史消息加载
- 分页消息加载
- 附件显示逻辑
```
