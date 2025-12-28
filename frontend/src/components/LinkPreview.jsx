import { useState, useEffect, memo } from "react";
import { ExternalLink, Globe, Loader2 } from "lucide-react";
import { getLinkPreview } from "../api";

// Regex to match URLs in text
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

// Extract URLs from text
export function extractUrls(text) {
    if (!text) return [];
    const matches = text.match(URL_REGEX);
    return matches ? [...new Set(matches)] : [];
}

// Component to display a single link preview
const LinkPreviewCard = memo(function LinkPreviewCard({ url, authFetch }) {
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function fetchPreview() {
            try {
                setLoading(true);
                setError(false);
                const data = await getLinkPreview(url, authFetch);
                if (!cancelled) {
                    setPreview(data);
                }
            } catch (err) {
                console.error("Failed to fetch link preview:", err);
                if (!cancelled) {
                    setError(true);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        fetchPreview();
        return () => { cancelled = true; };
    }, [url, authFetch]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                <span className="text-sm text-gray-500">Loading preview...</span>
            </div>
        );
    }

    if (error || !preview) {
        return null;
    }

    // Don't show preview if there's no meaningful content
    if (!preview.title && !preview.description && !preview.image) {
        return null;
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-gray-200 bg-white overflow-hidden hover:border-indigo-300 hover:shadow-md transition-all group"
        >
            <div className="flex">
                {/* Image */}
                {preview.image && (
                    <div className="shrink-0 w-[120px] h-[90px] bg-gray-100 overflow-hidden">
                        <img
                            src={preview.image}
                            alt={preview.title || "Preview"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                                e.target.style.display = "none";
                            }}
                        />
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 p-3 min-w-0">
                    {/* Site name */}
                    <div className="flex items-center gap-1.5 mb-1">
                        {preview.favicon ? (
                            <img
                                src={preview.favicon}
                                alt=""
                                className="w-4 h-4 rounded"
                                onError={(e) => {
                                    e.target.style.display = "none";
                                }}
                            />
                        ) : (
                            <Globe className="w-3.5 h-3.5 text-gray-400" />
                        )}
                        <span className="text-xs text-gray-500 truncate">
                            {preview.siteName || new URL(url).hostname}
                        </span>
                        <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Title */}
                    {preview.title && (
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                            {preview.title}
                        </h4>
                    )}

                    {/* Description */}
                    {preview.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
                            {preview.description}
                        </p>
                    )}
                </div>
            </div>
        </a>
    );
});

// Component to render all link previews from text content
function LinkPreviews({ text, authFetch, maxPreviews = 3 }) {
    const urls = extractUrls(text);

    if (urls.length === 0) {
        return null;
    }

    // Limit number of previews
    const displayUrls = urls.slice(0, maxPreviews);

    return (
        <div className="mt-3 space-y-2">
            {displayUrls.map((url) => (
                <LinkPreviewCard key={url} url={url} authFetch={authFetch} />
            ))}
        </div>
    );
}

export default LinkPreviews;
export { LinkPreviewCard };
