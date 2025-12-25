import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { Search, Hash, User, X, Clock } from "lucide-react";
import useAuth from "../hooks/useAuth";
import { searchWorkspace } from "../api";

const RECENT_SEARCHES_KEY = "workspace_recent_searches";
const MAX_RECENT_SEARCHES = 3;

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState({ channels: [], members: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);
  const { authFetch } = useAuth();
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`${RECENT_SEARCHES_KEY}_${workspaceId}`);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse recent searches", e);
      }
    }
  }, [workspaceId]);

  // Save to recent searches
  const saveToRecentSearches = (searchQuery) => {
    if (!searchQuery.trim()) return;

    const updated = [
      searchQuery,
      ...recentSearches.filter((s) => s !== searchQuery),
    ].slice(0, MAX_RECENT_SEARCHES);

    setRecentSearches(updated);
    localStorage.setItem(`${RECENT_SEARCHES_KEY}_${workspaceId}`, JSON.stringify(updated));
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(`${RECENT_SEARCHES_KEY}_${workspaceId}`);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search API call with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults({ channels: [], members: [] });
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchWorkspace(workspaceId, query, authFetch);
        setResults(data);
        setIsOpen(true);
        setSelectedIndex(0);
      } catch (error) {
        console.error("Search error:", error);
        setResults({ channels: [], members: [] });
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [query, workspaceId, authFetch]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(event) {
      if (!isOpen) return;

      const totalResults = results.channels.length + results.members.length;
      if (totalResults === 0) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < totalResults - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case "Enter":
          event.preventDefault();
          handleSelectResult(selectedIndex);
          break;
        case "Escape":
          event.preventDefault();
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, results]);

  const handleSelectResult = (index) => {
    const channelsCount = results.channels.length;

    if (index < channelsCount) {
      // Navigate to channel
      const channel = results.channels[index];
      navigate(`/workspace/${workspaceId}/channel/${channel.id}`);
    } else {
      // Navigate to direct message
      const member = results.members[index - channelsCount];
      navigate(`/workspace/${workspaceId}/dm/${member.userId}`);
    }

    // Save to recent searches
    saveToRecentSearches(query);

    setQuery("");
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClearSearch = () => {
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleRecentSearchClick = (recentQuery) => {
    setQuery(recentQuery);
    inputRef.current?.focus();
  };

  const totalResults = results.channels.length + results.members.length;

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search in workspace..."
          className="w-full rounded-md border border-slate-700 bg-slate-800 py-1.5 pl-10 pr-10 text-sm text-white placeholder-slate-400 transition-all hover:bg-slate-750 focus:border-indigo-500 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        {query && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          {/* Recent Searches - Show when no query */}
          {!query.trim() && recentSearches.length > 0 ? (
            <div className="max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between bg-slate-50 px-4 py-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Recent Searches
                </div>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Clear
                </button>
              </div>
              {recentSearches.map((recentQuery, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentSearchClick(recentQuery)}
                  className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50 last:border-b-0"
                >
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-700">{recentQuery}</span>
                </button>
              ))}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
            </div>
          ) : totalResults === 0 && query.trim() ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              No results found for "{query}"
            </div>
          ) : query.trim() ? (
            <div className="max-h-96 overflow-y-auto">
              {/* Channels Section */}
              {results.channels.length > 0 && (
                <div>
                  <div className="sticky top-0 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Channels
                  </div>
                  {results.channels.map((channel, index) => (
                    <button
                      key={channel.id}
                      onClick={() => handleSelectResult(index)}
                      className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors ${
                        selectedIndex === index
                          ? "bg-indigo-50 text-indigo-900"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          selectedIndex === index
                            ? "bg-indigo-500 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        <Hash className="h-4 w-4" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="truncate font-medium">
                          {channel.name}
                        </div>
                        {channel.description && (
                          <div className="truncate text-xs text-slate-500">
                            {channel.description}
                          </div>
                        )}
                      </div>
                      {channel.isPrivate && (
                        <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                          Private
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Members Section */}
              {results.members.length > 0 && (
                <div>
                  <div className="sticky top-0 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    People
                  </div>
                  {results.members.map((member, index) => {
                    const resultIndex = results.channels.length + index;
                    return (
                      <button
                        key={member.userId}
                        onClick={() => handleSelectResult(resultIndex)}
                        className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 ${
                          selectedIndex === resultIndex
                            ? "bg-indigo-50 text-indigo-900"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.fullName}
                            className="h-8 w-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                              selectedIndex === resultIndex
                                ? "bg-indigo-500 text-white"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            <User className="h-4 w-4" />
                          </div>
                        )}
                        <div className="flex-1 overflow-hidden">
                          <div className="truncate font-medium">
                            {member.fullName}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            @{member.username}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
