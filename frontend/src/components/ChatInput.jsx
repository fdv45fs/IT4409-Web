import { useState, useRef, useEffect } from "react";

function ChatInput({
  onSend,
  onTyping,
  onStopTyping,
  replyTo,
  onCancelReply,
  members = [],
  disabled = false,
  placeholder = "Type a message... (@ to mention)",
  onSendWithFiles, // New prop for sending with files
}) {
  const [content, setContent] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [pendingFiles, setPendingFiles] = useState([]); // New state for files
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const mentionStartRef = useRef(null);

  const filteredMembers = members.filter(
    (m) =>
      m.user?.username?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      m.user?.fullName?.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyTo]);

  const handleChange = (e) => {
    const value = e.target.value;
    setContent(value);

    // Check for @ mention
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Check if there's no space after @
      if (!textAfterAt.includes(" ")) {
        mentionStartRef.current = lastAtIndex;
        setMentionQuery(textAfterAt);
        setShowMentions(true);
        setMentionIndex(0);
        return;
      }
    }

    setShowMentions(false);
    setMentionQuery("");

    // Trigger typing indicator
    if (value.length > 0) {
      onTyping();
    }
  };

  const handleMentionSelect = (member) => {
    const username = member.user?.username || "";
    const beforeMention = content.slice(0, mentionStartRef.current);
    const afterMention = content.slice(
      mentionStartRef.current + 1 + mentionQuery.length
    );
    const newContent = `${beforeMention}@${username} ${afterMention}`;

    setContent(newContent);
    setShowMentions(false);
    setMentionQuery("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    // Handle mention navigation
    if (showMentions && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) =>
          prev < filteredMembers.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredMembers.length - 1
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleMentionSelect(filteredMembers[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        setShowMentions(false);
        return;
      }
    }

    // Send message on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((!content.trim() && pendingFiles.length === 0) || disabled) return;

    // Extract mentioned userIds from content
    const mentionedUserIds = [];
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const username = match[1];
      const member = members.find((m) => m.user?.username === username);
      if (member && !mentionedUserIds.includes(member.user.id)) {
        mentionedUserIds.push(member.user.id);
      }
    }

    // If has files, use new callback
    if (pendingFiles.length > 0 && onSendWithFiles) {
      onSendWithFiles(content.trim(), replyTo?.id, mentionedUserIds, pendingFiles);
    } else {
      onSend(content.trim(), replyTo?.id, mentionedUserIds);
    }

    setContent("");
    setPendingFiles([]);
    onStopTyping();
    onCancelReply?.();
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setPendingFiles(prev => [...prev, ...files]);
    }
    // Reset input
    e.target.value = null;
  };

  // Remove file from pending list
  const removeFile = (index) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      {/* Reply preview */}
      {replyTo && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
            <span className="text-gray-500">Replying to</span>
            <span className="font-medium text-gray-700">
              {replyTo.sender?.fullName || replyTo.sender?.username}
            </span>
            <span className="max-w-xs truncate text-gray-500">
              {replyTo.content}
            </span>
          </div>
          <button
            onClick={onCancelReply}
            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="relative">
        {/* Mention suggestions dropdown */}
        {showMentions && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 w-64 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {filteredMembers.map((member, index) => (
              <button
                key={member.id}
                onClick={() => handleMentionSelect(member)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  index === mentionIndex ? "bg-indigo-50" : ""
                }`}
              >
                {member.user?.avatarUrl ? (
                  <img
                    src={member.user.avatarUrl}
                    alt=""
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600">
                    {member.user?.fullName?.slice(0, 1) || "?"}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {member.user?.fullName}
                  </p>
                  <p className="text-xs text-gray-500">
                    @{member.user?.username}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* File preview */}
        {pendingFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingFiles.map((file, index) => (
              <div key={index} className="relative w-16">
                {file.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
                <button
                  onClick={() => removeFile(index)}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs hover:bg-red-600"
                >
                  ×
                </button>
                <p className="mt-1 w-16 truncate text-xs text-gray-500">{file.name}</p>
              </div>
            ))}
          </div>
        )}

        {/* Text input + send (grouped) + attach (outside) */}
        <div className="flex items-end gap-2">
          {/* File upload button (outside group) */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-600 disabled:opacity-50"
            title="Attach file"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>

          {/* Group: textarea + send button (send centered vertically) */}
          <div
            className={`flex min-h-[42px] flex-1 items-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-2 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-indigo-500 ${
              disabled ? "opacity-50" : ""
            }`}
          >
            <textarea
              ref={inputRef}
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={onStopTyping}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="w-full flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
              style={{
                height: "42px",
                minHeight: "42px",
                maxHeight: "120px",
              }}
              onInput={(e) => {
                const el = e.target;
                el.style.height = "42px";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={
                (!content.trim() && pendingFiles.length === 0) || disabled
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              title="Send"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInput;

