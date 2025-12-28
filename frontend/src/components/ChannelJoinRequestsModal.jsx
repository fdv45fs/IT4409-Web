import { useState, useEffect, useCallback } from "react";
import {
  getChannelJoinRequests,
  approveChannelJoinRequest,
  rejectChannelJoinRequest,
} from "../api";
import useAuth from "../hooks/useAuth";

function ChannelJoinRequestsModal({ channelId, onClose, onUpdate }) {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { authFetch } = useAuth();

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getChannelJoinRequests(channelId, authFetch);
      // Backend returns all requests, filter for only pending ones
      const allRequests = Array.isArray(data) ? data : data.requests || [];
      const pendingRequests = allRequests.filter(
        (req) => req.status === "PENDING"
      );
      setRequests(pendingRequests);
    } catch (err) {
      setError("Unable to load join requests");
    } finally {
      setIsLoading(false);
    }
  }, [channelId, authFetch]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (requestId) => {
    try {
      await approveChannelJoinRequest(channelId, requestId, authFetch);
      setRequests(requests.filter((r) => r.id !== requestId));
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.message || "Error approving request");
    }
  };

  const handleReject = async (requestId) => {
    try {
      await rejectChannelJoinRequest(channelId, requestId, authFetch);
      setRequests(requests.filter((r) => r.id !== requestId));
    } catch (err) {
      alert(err.message || "Error rejecting request");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden bg-white shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between bg-[rgb(30,41,59)] px-6 py-4 flex-shrink-0">
          <h2 className="text-2xl font-bold text-white">
            Channel Join Requests
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Close modal"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-6">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-center">
              {error}
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-gray-500">
              No pending requests.
            </div>
          ) : (
            <ul className="space-y-3">
              {requests.map((req) => (
                <li
                  key={req.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-[rgb(30,41,59)] flex items-center justify-center text-white font-bold">
                      {(
                        req.user?.fullName?.[0] ||
                        req.user?.username?.[0] ||
                        "?"
                      ).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[rgb(30,41,59)]">
                        {req.user?.fullName || req.user?.username}
                      </p>
                      <p className="text-xs text-gray-500">
                        @{req.user?.username}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition"
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChannelJoinRequestsModal;
