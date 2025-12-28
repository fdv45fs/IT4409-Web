import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

export default function ChatSearchBar({
  onSearch,
  placeholder = "Search messages...",
  value,
  onValueChange,
  inputRef: externalInputRef,
  focusSignal,
  isSearching: isSearchingProp,
}) {
  const [uncontrolledQuery, setUncontrolledQuery] = useState("");
  const [isSearchingLocal, setIsSearchingLocal] = useState(false);
  const internalInputRef = useRef(null);
  const inputRef = externalInputRef || internalInputRef;

  const query = typeof value === "string" ? value : uncontrolledQuery;
  const setQuery = typeof onValueChange === "function" ? onValueChange : setUncontrolledQuery;
  const isSearching = typeof isSearchingProp === "boolean" ? isSearchingProp : isSearchingLocal;

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      if (typeof isSearchingProp !== "boolean") setIsSearchingLocal(false);
      onSearch("");
      return;
    }

    if (typeof isSearchingProp !== "boolean") setIsSearchingLocal(true);
    const timeoutId = setTimeout(() => {
      onSearch(query.trim());
      if (typeof isSearchingProp !== "boolean") setIsSearchingLocal(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, onSearch]);

  useEffect(() => {
    if (focusSignal === undefined || focusSignal === null) return;
    inputRef.current?.focus();
  }, [focusSignal, inputRef]);

  const clearSearch = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex items-center gap-3 px-4 py-3 border-b border-gray-300 bg-white">
      <Search className="h-4 w-4 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
      />
      {query && (
        <button
          type="button"
          onClick={clearSearch}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {isSearching && (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-indigo-600"></div>
      )}
    </div>
  );
}