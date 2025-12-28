import { useState, useEffect } from "react";
import useAuth from "../hooks/useAuth.js";

function JoinRequests({ workspaceId }) {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const { authFetch } = useAuth();

  const fetchRequests = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await authFetch(`/api/workspaces/${workspaceId}/join-requests`);
      // Backend returns { requests: [...], totalCount, myRole }
      setRequests(data.requests || []);
    } catch (err) {
      setError(err.message || "Failed to load join requests");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchRequests();
    }
  }, [workspaceId]);

  // Check if request is new (within last 24 hours)
  const isNewRequest = (createdAt) => {
    if (!createdAt) return false;
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    return new Date(createdAt) > oneDayAgo;
  };

  const handleAccept = async (requestId) => {
    // Optimistic UI update
    const originalRequests = [...requests];
    setRequests(requests.filter((req) => req.id !== requestId));
    setActionLoading(requestId);

    try {
      await authFetch(
        `/api/workspaces/${workspaceId}/join-requests/${requestId}/accept`,
        { method: "PUT" }
      );

      // Show success message
      setSuccessMessage("Request approved successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      // Rollback on error
      setRequests(originalRequests);
      setError(err.message || "Failed to approve request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId) => {
    // Confirmation dialog
    if (!window.confirm("Are you sure you want to reject this request?")) {
      return;
    }

    // Optimistic UI update
    const originalRequests = [...requests];
    setRequests(requests.filter((req) => req.id !== requestId));
    setActionLoading(requestId);

    try {
      await authFetch(
        `/api/workspaces/${workspaceId}/join-requests/${requestId}/reject`,
        { method: "PUT" }
      );

      // Show success message
      setSuccessMessage("Request rejected");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      // Rollback on error
      setRequests(originalRequests);
      setError(err.message || "Failed to reject request");
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-600 border-t-transparent mx-auto"></div>
          <p className="mt-3 text-sm text-gray-600">Loading join requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 scroll-smooth">
      <div className="mx-auto max-w-4xl p-8 space-y-8">
        {/* Header Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Join Requests</h1>
              <p className="mt-1 text-sm text-gray-600">
                Review and approve workspace join requests
              </p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 p-1 bg-green-100 rounded-full">
                <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-green-800">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 p-1 bg-red-100 rounded-full">
                <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Requests Card */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          {/* Card Header */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 via-slate-50/30 to-gray-50 px-8 py-6">
            <h2 className="text-xl font-bold text-gray-900">
              Requests
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-semibold text-slate-600">{requests.length}</span> {requests.length === 1 ? 'pending request' : 'pending requests'}
            </p>
          </div>

          {/* Card Body */}
          {requests.length === 0 ? (
            <div className="px-8 py-16 text-center animate-in fade-in duration-500">
              <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
                <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-900">No pending requests</p>
              <p className="mt-2 text-sm text-gray-600 max-w-sm mx-auto">
                When someone requests to join this workspace, their request will appear here for review.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {requests.map((request, index) => (
                <li
                  key={request.id}
                  className="group relative flex items-center gap-5 px-8 py-5 hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-transparent border-l-4 border-transparent hover:border-slate-500 transition-all duration-200 animate-in fade-in slide-in-from-left"
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                >
                  {/* New Badge */}
                  {isNewRequest(request.createdAt) && (
                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 rounded-full ring-2 ring-slate-200 animate-pulse">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        New
                      </span>
                    </div>
                  )}

                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-slate-500 to-slate-600 text-lg font-bold text-white shadow-lg ring-4 ring-white group-hover:shadow-xl group-hover:scale-105 transition-all duration-200">
                      {(request.fullName || request.username || "U").charAt(0).toUpperCase()}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-base font-bold text-gray-900">
                        {request.fullName}
                      </p>
                    </div>
                    <p className="truncate text-sm text-gray-600 mt-1">
                      <span className="font-semibold">@{request.username}</span>
                    </p>
                    {request.createdAt && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                          {new Date(request.createdAt).toLocaleString("en-US", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAccept(request.id)}
                      disabled={actionLoading === request.id}
                      className="group/accept inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-500/30 hover:shadow-xl hover:shadow-slate-500/40 hover:from-slate-700 hover:to-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-500/50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200"
                      title="Approve join request"
                    >
                      {actionLoading === request.id ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 transition-transform duration-200 group-hover/accept:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      disabled={actionLoading === request.id}
                      className="group/reject inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-red-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      title="Reject request"
                    >
                      {actionLoading === request.id ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 transition-transform duration-200 group-hover/reject:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
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

export default JoinRequests;
