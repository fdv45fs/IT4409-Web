export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function request(path, options = {}) {
  const { headers, body, ...rest } = options;

  // Don't set Content-Type for FormData - browser will set it with boundary
  const isFormData = body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    method: rest.method ?? "GET",
    credentials: rest.credentials ?? "include",
    body,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(headers || {}),
    },
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // ignore if body is empty
  }

  if (!response.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(", ")
      : data?.message || "Error occurred, please try again.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

export function login(credentials) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function register(payload) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function refresh() {
  return request("/api/auth/refresh-token", {
    method: "POST",
  });
}

export function logout(token) {
  return request("/api/auth/logout", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export function forgotPassword(email) {
  return request("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token, newPassword) {
  return request("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}

// Channel APIs
// Allow passing a custom fetcher (like authFetch) to handle authentication headers
export function getChannels(workspaceId, fetcher = request) {
  const queryString = workspaceId ? `?workspaceId=${workspaceId}` : "";
  return fetcher(`/api/channels${queryString}`);
}

export function getChannelDetails(channelId, fetcher = request) {
  return fetcher(`/api/channels/${channelId}`);
}

export function createChannel(data, fetcher = request) {
  return fetcher("/api/channels", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateChannel(channelId, data, fetcher = request) {
  return fetcher(`/api/channels/${channelId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function addChannelMember(channelId, data, fetcher = request) {
  return fetcher(`/api/channels/${channelId}/members`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getChannelMembers(channelId, fetcher = request) {
  return fetcher(`/api/channels/${channelId}/members`);
}

export function removeChannelMember(channelId, memberId, fetcher = request) {
  return fetcher(`/api/channels/${channelId}/members/${memberId}`, {
    method: "DELETE",
  });
}

export function deleteChannel(channelId, fetcher = request) {
  return fetcher(`/api/channels/${channelId}`, {
    method: "DELETE",
  });
}

export function getChannelJoinRequests(channelId, fetcher = request) {
  return fetcher(`/api/channels/${channelId}/join-requests`);
}

export function approveChannelJoinRequest(
  channelId,
  requestId,
  fetcher = request
) {
  return fetcher(
    `/api/channels/${channelId}/join-requests/${requestId}/approve`,
    {
      method: "PATCH",
    }
  );
}

export function rejectChannelJoinRequest(
  channelId,
  requestId,
  fetcher = request
) {
  return fetcher(
    `/api/channels/${channelId}/join-requests/${requestId}/reject`,
    {
      method: "PATCH",
    }
  );
}

export function getWorkspaceMembers(workspaceId, fetcher = request) {
  return fetcher(`/api/workspaces/${workspaceId}/members`);
}

export function searchWorkspace(workspaceId, query, fetcher = request) {
  const params = new URLSearchParams({ q: query });
  return fetcher(`/api/workspaces/${workspaceId}/search?${params}`);
}

export function joinChannelByCode(code, fetcher = request) {
  return fetcher("/api/channels/join", {
    method: "POST",
    body: JSON.stringify({ joinCode: code }),
  });
}

export function leaveChannel(channelId, fetcher = request) {
  return fetcher(`/api/channels/${channelId}/members/me`, {
    method: "DELETE",
  });
}

export function updateChannelMemberRole(
  channelId,
  memberId,
  role,
  fetcher = request
) {
  return fetcher(`/api/channels/${channelId}/members/${memberId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ newRole: role }),
  });
}

// Posts
export function createPost(channelId, data, fetcher = request) {
  return fetcher(`/api/channels/${channelId}/posts`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getPosts(channelId, fetcher = request) {
  return fetcher(`/api/channels/${channelId}/posts`);
}

export function getPostDetail(channelId, postId, fetcher = request) {
  return fetcher(`/api/channels/${channelId}/posts/${postId}`);
}

export function updatePost(channelId, postId, data, fetcher = request) {
  return fetcher(`/api/channels/${channelId}/posts/${postId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deletePost(channelId, postId, fetcher = request) {
  return fetcher(`/api/channels/${channelId}/posts/${postId}`, {
    method: "DELETE",
  });
}

export function getPostReactions(channelId, postId, fetcher = request) {
  return fetcher(`/api/channels/${channelId}/posts/${postId}/reactions`);
}

// Toggle reaction - thêm nếu chưa có, xóa nếu đã có
export function togglePostReaction(channelId, postId, emoji, fetcher = request) {
  return fetcher(`/api/channels/${channelId}/posts/${postId}/reactions`, {
    method: "POST",
    body: JSON.stringify({ emoji }),
  });
}

// Legacy - sử dụng togglePostReaction thay thế
export function addPostReaction(channelId, postId, emoji, fetcher = request) {
  return togglePostReaction(channelId, postId, emoji, fetcher);
}

export function removePostReaction(channelId, postId, emoji, fetcher = request) {
  return fetcher(
    `/api/channels/${channelId}/posts/${postId}/reactions/${encodeURIComponent(emoji)}`,
    {
      method: "DELETE",
    }
  );
}

// Upload files cho bài đăng
export function uploadPostFiles(channelId, postId, files, fetcher = request) {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  return fetcher(`/api/upload/channel/${channelId}/posts/${postId}/files`, {
    method: "POST",
    body: formData,
  });
}

// Xóa file đính kèm khỏi bài đăng
export function removePostAttachment(channelId, postId, attachmentId, fetcher = request) {
  return fetcher(
    `/api/channels/${channelId}/posts/${postId}/attachments/${attachmentId}`,
    {
      method: "DELETE",
    }
  );
}

export function getPostComments(channelId, postId, fetcher = request) {
  return fetcher(`/api/channels/${channelId}/posts/${postId}/comments`);
}

export function addPostComment(channelId, postId, content, fetcher = request) {
  return fetcher(`/api/channels/${channelId}/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function updatePostComment(
  channelId,
  postId,
  commentId,
  content,
  fetcher = request
) {
  return fetcher(
    `/api/channels/${channelId}/posts/${postId}/comments/${commentId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ content }),
    }
  );
}

export function deletePostComment(
  channelId,
  postId,
  commentId,
  fetcher = request
) {
  return fetcher(
    `/api/channels/${channelId}/posts/${postId}/comments/${commentId}`,
    {
      method: "DELETE",
    }
  );
}

export function getCommentReactions(
  channelId,
  postId,
  commentId,
  fetcher = request
) {
  return fetcher(
    `/api/channels/${channelId}/posts/${postId}/comments/${commentId}/reactions`
  );
}

export function addCommentReaction(
  channelId,
  postId,
  commentId,
  emoji,
  fetcher = request
) {
  return fetcher(
    `/api/channels/${channelId}/posts/${postId}/comments/${commentId}/reactions`,
    {
      method: "POST",
      body: JSON.stringify({ emoji }),
    }
  );
}

export function removeCommentReaction(
  channelId,
  postId,
  commentId,
  emoji,
  fetcher = request
) {
  return fetcher(
    `/api/channels/${channelId}/posts/${postId}/comments/${commentId}/reactions/${encodeURIComponent(emoji)}`,
    {
      method: "DELETE",
    }
  );
}

// Toggle comment reaction - thêm nếu chưa có, xóa nếu đã có
export function toggleCommentReaction(
  channelId,
  postId,
  commentId,
  emoji,
  fetcher = request
) {
  return fetcher(
    `/api/channels/${channelId}/posts/${postId}/comments/${commentId}/reactions`,
    {
      method: "POST",
      body: JSON.stringify({ emoji }),
    }
  );
}

// Upload files cho bình luận
export function uploadCommentFiles(
  channelId,
  postId,
  commentId,
  files,
  fetcher = request
) {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  return fetcher(`/api/upload/channel/${channelId}/posts/${postId}/comments/${commentId}/files`, {
    method: "POST",
    body: formData,
  });
}

// Chat APIs
export function getChatMessages(channelId, params = {}, fetcher = request) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append("page", params.page);
  if (params.limit) queryParams.append("limit", params.limit);
  if (params.beforeId) queryParams.append("beforeId", params.beforeId);
  if (params.afterId) queryParams.append("afterId", params.afterId);

  const queryString = queryParams.toString();
  return fetcher(
    `/api/channels/${channelId}/chat/messages${queryString ? `?${queryString}` : ""
    }`
  );
}

export function sendChatMessage(channelId, data, fetcher = request) {
  return fetcher(`/api/channels/${channelId}/chat/messages`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteChatMessage(channelId, messageId, fetcher = request) {
  return fetcher(`/api/channels/${channelId}/chat/messages/${messageId}`, {
    method: "DELETE",
  });
}

export function addMessageReaction(
  channelId,
  messageId,
  emoji,
  fetcher = request
) {
  return fetcher(
    `/api/channels/${channelId}/chat/messages/${messageId}/reactions`,
    {
      method: "POST",
      body: JSON.stringify({ emoji }),
    }
  );
}

export function removeMessageReaction(
  channelId,
  messageId,
  emoji,
  fetcher = request
) {
  return fetcher(
    `/api/channels/${channelId}/chat/messages/${messageId}/reactions/${encodeURIComponent(
      emoji
    )}`,
    {
      method: "DELETE",
    }
  );
}

export function markChatAsRead(channelId, fetcher = request) {
  return fetcher(`/api/channels/${channelId}/chat/mark-read`, {
    method: "POST",
  });
}

export function getChatConversation(channelId, fetcher = request) {
  return fetcher(`/api/channels/${channelId}/chat/conversation`);
}

// ================== Direct Messaging APIs ==================

// Get list of direct conversations in workspace
export function getDirectConversations(workspaceId, fetcher = request) {
  return fetcher(`/api/workspaces/${workspaceId}/direct-messages`);
}

// Create or get direct conversation with another user
export function getOrCreateDirectConversation(
  workspaceId,
  otherUserId,
  fetcher = request
) {
  return fetcher(
    `/api/workspaces/${workspaceId}/direct-messages/conversations`,
    {
      method: "POST",
      body: JSON.stringify({ otherUserId }),
    }
  );
}

// Send direct message
export function sendDirectMessage(workspaceId, data, fetcher = request) {
  return fetcher(`/api/workspaces/${workspaceId}/direct-messages/send`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Get messages in direct conversation
export function getDirectMessages(
  workspaceId,
  conversationId,
  params = {},
  fetcher = request
) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append("page", params.page);
  if (params.limit) queryParams.append("limit", params.limit);
  if (params.beforeId) queryParams.append("beforeId", params.beforeId);
  if (params.afterId) queryParams.append("afterId", params.afterId);

  const queryString = queryParams.toString();
  return fetcher(
    `/api/workspaces/${workspaceId}/direct-messages/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ""
    }`
  );
}

// Get single message by ID in direct conversation
export function getDirectMessageById(
  workspaceId,
  conversationId,
  messageId,
  fetcher = request
) {
  return fetcher(
    `/api/workspaces/${workspaceId}/direct-messages/conversations/${conversationId}/messages/${messageId}`
  );
}

// Get single message by ID in channel
export function getChannelMessageById(channelId, messageId, fetcher = request) {
  return fetcher(`/api/channels/${channelId}/chat/messages/${messageId}`);
}

// Delete direct message
export function deleteDirectMessage(
  workspaceId,
  conversationId,
  messageId,
  fetcher = request
) {
  return fetcher(
    `/api/workspaces/${workspaceId}/direct-messages/conversations/${conversationId}/messages/${messageId}`,
    {
      method: "DELETE",
    }
  );
}

// Add reaction to direct message
export function addDirectMessageReaction(
  workspaceId,
  conversationId,
  messageId,
  emoji,
  fetcher = request
) {
  return fetcher(
    `/api/workspaces/${workspaceId}/direct-messages/conversations/${conversationId}/messages/${messageId}/reactions`,
    {
      method: "POST",
      body: JSON.stringify({ emoji }),
    }
  );
}

// Remove reaction from direct message
export function removeDirectMessageReaction(
  workspaceId,
  conversationId,
  messageId,
  emoji,
  fetcher = request
) {
  return fetcher(
    `/api/workspaces/${workspaceId}/direct-messages/conversations/${conversationId}/messages/${messageId}/reactions/${encodeURIComponent(
      emoji
    )}`,
    {
      method: "DELETE",
    }
  );
}

// Mark direct conversation as read
export function markDirectConversationAsRead(
  workspaceId,
  conversationId,
  fetcher = request
) {
  return fetcher(
    `/api/workspaces/${workspaceId}/direct-messages/conversations/${conversationId}/mark-read`,
    {
      method: "POST",
    }
  );
}

// Upload files for message
export function uploadMessageFiles(channelId, messageId, files, fetcher = request) {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  return fetcher(`/api/upload/channel/${channelId}/messages/${messageId}/files`, {
    method: "POST",
    body: formData,
  });
}

// Upload files for direct message
export function uploadDirectMessageFiles(messageId, files, fetcher = request) {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  return fetcher(`/api/upload/direct/messages/${messageId}/files`, {
    method: "POST",
    body: formData,
  });
}

// Search messages in channel
export function searchChannelMessages(channelId, query, fetcher = request) {
  const params = new URLSearchParams({ q: query });
  return fetcher(`/api/channels/${channelId}/chat/search?${params}`);
}

// Search messages in direct conversation
export function searchDirectMessages(workspaceId, conversationId, query, fetcher = request) {
  const params = new URLSearchParams({ q: query });
  return fetcher(`/api/workspaces/${workspaceId}/direct-messages/conversations/${conversationId}/search?${params}`);
}

// Link Preview API
export function getLinkPreview(url, fetcher = request) {
  const params = new URLSearchParams({ url });
  return fetcher(`/api/link-preview?${params}`);
}

