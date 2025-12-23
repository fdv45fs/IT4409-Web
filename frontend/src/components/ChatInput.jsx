import { useState, useRef, useEffect } from "react";

function ChatInput({
  onSend,
  onTyping,
  onStopTyping,
  replyTo,
  onCancelReply,
  members = [],
  disabled = false,
}) {
  const [content, setContent] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const inputRef = useRef(null);
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
    if (!content.trim() || disabled) return;

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

    onSend(content.trim(), replyTo?.id, mentionedUserIds);
    setContent("");
    onStopTyping();
    onCancelReply?.();
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
            <span className="text-gray-500">Đang trả lời</span>
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

        {/* Text input */}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={onStopTyping}
              placeholder="Nhập tin nhắn... (@ để mention)"
              disabled={disabled}
              rows={1}
              className="w-full resize-none rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              style={{
                minHeight: "42px",
                maxHeight: "120px",
              }}
              onInput={(e) => {
                e.target.style.height = "42px";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!content.trim() || disabled}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
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
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatInput;

