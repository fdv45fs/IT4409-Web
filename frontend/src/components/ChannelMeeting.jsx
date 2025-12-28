import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import useAuth from "../hooks/useAuth";
import Toast from "./Toast";
import VideoGrid from "./VideoGrid";
import VideoTile from "./VideoTile";
import MeetingControls from "./MeetingControls";
import MeetingParticipants from "./MeetingParticipants";

function ChannelMeeting({
  channelId,
  isChannelAdmin,
  onMeetingStateChange,
  isMinimized = false,
  onToggleMinimize,
}) {
  const { authFetch } = useAuth();
  const [meeting, setMeeting] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [toast, setToast] = useState(null);
  const [showParticipants, setShowParticipants] = useState(false);

  // Daily.co state
  const callObjectRef = useRef(null);
  const [participants, setParticipants] = useState({});
  const [localParticipant, setLocalParticipant] = useState(null);
  const [screenShare, setScreenShare] = useState(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const leaveNotifiedRef = useRef(false);

  // Minimized PiP drag state
  const pipSize = useMemo(() => ({ width: 352, height: 280 }), []);
  const getDefaultPipPosition = () => {
    if (typeof window === "undefined") return { x: 16, y: 16 };
    return {
      x: Math.max(16, window.innerWidth - pipSize.width - 16),
      y: Math.max(16, window.innerHeight - pipSize.height - 16),
    };
  };
  const [pipPosition, setPipPosition] = useState(() => getDefaultPipPosition());
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  const intervalRef = useRef(null);

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
  }, []);

  const closeToast = useCallback(() => {
    setToast(null);
  }, []);

  const handleMinimizeToggle = useCallback(() => {
    if (onToggleMinimize) {
      onToggleMinimize();
    }
  }, [onToggleMinimize]);

  const clampPipPosition = useCallback(
    (x, y) => {
      if (typeof window === "undefined") return { x, y };
      const maxX = Math.max(8, window.innerWidth - pipSize.width - 8);
      const maxY = Math.max(8, window.innerHeight - pipSize.height - 8);
      return {
        x: Math.min(Math.max(8, x), maxX),
        y: Math.min(Math.max(8, y), maxY),
      };
    },
    [pipSize.width, pipSize.height]
  );

  const handleDragMove = useCallback(
    (e) => {
      if (!isDraggingRef.current) return;
      const nextX = e.clientX - dragOffsetRef.current.x;
      const nextY = e.clientY - dragOffsetRef.current.y;
      setPipPosition(clampPipPosition(nextX, nextY));
    },
    [clampPipPosition]
  );

  const handleDragEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);
  }, [handleDragMove]);

  const handleDragStart = useCallback(
    (e) => {
      if (!isMinimized) return;
      // Avoid starting drag when clicking buttons
      if (e.target?.closest?.("button")) return;
      isDraggingRef.current = true;
      dragOffsetRef.current = {
        x: e.clientX - pipPosition.x,
        y: e.clientY - pipPosition.y,
      };
      document.addEventListener("mousemove", handleDragMove);
      document.addEventListener("mouseup", handleDragEnd);
      e.preventDefault();
    },
    [isMinimized, pipPosition.x, pipPosition.y, handleDragMove, handleDragEnd]
  );

  // Keep PiP on-screen when viewport changes
  useEffect(() => {
    const onResize = () => {
      setPipPosition((prev) => clampPipPosition(prev.x, prev.y));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampPipPosition]);

  // Cleanup drag listeners if component unmounts mid-drag
  useEffect(() => {
    return () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.removeEventListener("mousemove", handleDragMove);
      document.removeEventListener("mouseup", handleDragEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  const fetchMeetingStatus = useCallback(
    async (showLoadingState = true) => {
      if (showLoadingState) {
        setIsLoading(true);
      }
      try {
        const data = await authFetch(`/api/channels/${channelId}/meetings`);
        setMeeting(data);
      } catch {
        setMeeting(null);
      } finally {
        if (showLoadingState) {
          setIsLoading(false);
        }
      }
    },
    [authFetch, channelId]
  );

  // Initial fetch on mount
  useEffect(() => {
    fetchMeetingStatus(true);
  }, [fetchMeetingStatus]);

  // Polling interval - only when not in meeting
  useEffect(() => {
    if (!isInMeeting) {
      intervalRef.current = setInterval(() => {
        fetchMeetingStatus(false);
      }, 10000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isInMeeting, fetchMeetingStatus]);

  // Cleanup Daily instance on unmount
  useEffect(() => {
    return () => {
      if (callObjectRef.current) {
        callObjectRef.current.destroy();
        callObjectRef.current = null;
      }
    };
  }, []);

  const handleStartMeeting = async () => {
    setIsStarting(true);
    try {
      const data = await authFetch(
        `/api/channels/${channelId}/meetings/start`,
        {
          method: "POST",
          body: JSON.stringify({ title: meetingTitle || undefined }),
        }
      );
      setMeeting(data);
      setMeetingTitle("");
      showToast(
        "Meeting started successfully! Click 'Join Meeting' to enter.",
        "success"
      );
    } catch (err) {
      showToast(err.message || "Failed to start meeting", "error");
    } finally {
      setIsStarting(false);
    }
  };

  const handleJoinMeeting = async () => {
    // Guard: prevent joining multiple times
    if (isJoining || isInMeeting) {
      return;
    }

    setIsJoining(true);
    leaveNotifiedRef.current = false;
    try {
      // Destroy any existing Daily instance first
      if (callObjectRef.current) {
        try {
          await callObjectRef.current.destroy();
        } catch (e) {
          console.warn("Error destroying previous call object:", e);
        }
        callObjectRef.current = null;
      }

      // Wait for Daily.co SDK to load
      let attempts = 0;
      while (!window.DailyIframe && attempts < 50) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.DailyIframe) {
        throw new Error(
          "Daily.co SDK failed to load. Please refresh the page."
        );
      }

      // Request media permissions before joining
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        // Stop the test stream
        stream.getTracks().forEach((track) => track.stop());
      } catch (mediaError) {
        console.warn("Media permission warning:", mediaError);
        showToast(
          "Camera/microphone access denied. You can enable them later.",
          "warning"
        );
      }

      // Join meeting - returns token and roomUrl (both required by Daily SDK)
      const joinData = await authFetch(
        `/api/channels/${channelId}/meetings/join`,
        {
          method: "POST",
        }
      );

      // Create Daily call object
      const callObject = window.DailyIframe.createCallObject();

      callObjectRef.current = callObject;

      // Set up event listeners
      setupDailyListeners(callObject);

      // Join the call with both token and URL (token is verified by Daily)
      await callObject.join({
        url: joinData.roomUrl,
        token: joinData.token,
      });

      // Sync initial state with Daily.co
      const localP = callObject.participants().local;
      if (localP) {
        setIsMicOn(localP.audio);
        setIsCameraOn(localP.video);
      }

      setIsInMeeting(true);
      if (onMeetingStateChange) {
        onMeetingStateChange(true);
      }
      showToast("Joined meeting successfully!", "success");
    } catch (err) {
      console.error("Join meeting error:", err);
      showToast(err.message || "Failed to join meeting", "error");
      setIsInMeeting(false);
      if (onMeetingStateChange) {
        onMeetingStateChange(false);
      }
      if (callObjectRef.current) {
        callObjectRef.current.destroy();
        callObjectRef.current = null;
      }
    } finally {
      setIsJoining(false);
    }
  };

  const setupDailyListeners = (callObject) => {
    callObject
      .on("joined-meeting", () => {
        console.log("Joined meeting event");
        updateParticipants();
      })
      .on("left-meeting", async () => {
        try {
          // Ensure backend reflects leave when Daily triggers left-meeting
          if (!leaveNotifiedRef.current) {
            leaveNotifiedRef.current = true;
            await authFetch(`/api/channels/${channelId}/meetings/leave`, {
              method: "POST",
            });
          }
        } catch (err) {
          console.warn("Failed to notify backend on left-meeting:", err);
        }
        handleLeaveMeetingUI();
      })
      .on("participant-joined", (event) => {
        console.log("Participant joined:", event);
        updateParticipants();
      })
      .on("participant-updated", (event) => {
        console.log("Participant updated:", event);
        updateParticipants();

        // Update local mic/camera state if it's the local participant
        if (event.participant.local) {
          if (typeof event.participant.audio === "boolean") {
            setIsMicOn(event.participant.audio);
          }
          if (typeof event.participant.video === "boolean") {
            setIsCameraOn(event.participant.video);
          }
        }
      })
      .on("participant-left", (event) => {
        console.log("Participant left:", event);
        updateParticipants();
      })
      .on("track-started", (event) => {
        console.log("Track started:", event);
        updateParticipants();
      })
      .on("track-stopped", (event) => {
        console.log("Track stopped:", event);
        updateParticipants();
      })
      .on("started-screen-share", (event) => {
        console.log("Screen share started:", event);
        updateParticipants();
      })
      .on("stopped-screen-share", (event) => {
        console.log("Screen share stopped:", event);
        updateParticipants();
      })
      .on("error", (error) => {
        console.error("Daily error:", error);
        showToast("Meeting error occurred", "error");
      });
  };

  // Ensure we mark leave in DB when tab/window is closed
  useEffect(() => {
    if (!isInMeeting) return;

    const beforeUnloadHandler = () => {
      if (leaveNotifiedRef.current) return;
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;
        leaveNotifiedRef.current = true;
        // Use fetch with keepalive to reliably send on unload
        fetch(`/api/channels/${channelId}/meetings/leave`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          keepalive: true,
        });
      } catch {}
    };

    const pageHideHandler = () => {
      if (!leaveNotifiedRef.current) {
        beforeUnloadHandler();
      }
    };

    window.addEventListener("beforeunload", beforeUnloadHandler);
    window.addEventListener("pagehide", pageHideHandler);

    return () => {
      window.removeEventListener("beforeunload", beforeUnloadHandler);
      window.removeEventListener("pagehide", pageHideHandler);
    };
  }, [isInMeeting, channelId]);

  const updateParticipants = () => {
    if (!callObjectRef.current) return;

    const allParticipants = callObjectRef.current.participants();
    console.log("All participants:", allParticipants);

    const localP = allParticipants.local;
    console.log("Local participant:", localP);

    const remoteParticipants = {};
    let screenShareParticipant = null;

    // Check if local participant is screen sharing
    if (localP) {
      const localIsScreenShare =
        localP.screen ||
        localP.screenVideoTrack ||
        localP.tracks?.screenVideo?.state === "playable";

      console.log("Local participant screen check:", {
        screen: localP.screen,
        screenVideoTrack: localP.screenVideoTrack,
        screenVideoState: localP.tracks?.screenVideo?.state,
        isScreenShare: localIsScreenShare,
      });

      if (localIsScreenShare) {
        screenShareParticipant = localP;
      }
    }

    // Check remote participants
    Object.entries(allParticipants).forEach(([id, participant]) => {
      if (id === "local") return;

      // Check if this is a screen share participant
      // Daily.co screen share participants have screen: true or screenVideoTrack
      const isScreenShare =
        participant.screen ||
        participant.screenVideoTrack ||
        participant.tracks?.screenVideo?.state === "playable";

      console.log(`Participant ${id} screen check:`, {
        screen: participant.screen,
        screenVideoTrack: participant.screenVideoTrack,
        screenVideoState: participant.tracks?.screenVideo?.state,
        isScreenShare,
      });

      if (isScreenShare && !screenShareParticipant) {
        screenShareParticipant = participant;
      } else {
        remoteParticipants[id] = participant;
      }
    });

    console.log("Remote participants:", remoteParticipants);
    console.log("Screen share participant:", screenShareParticipant);

    setLocalParticipant(localP);
    setParticipants(remoteParticipants);
    setScreenShare(screenShareParticipant);
  };

  const handleToggleMic = async () => {
    if (!callObjectRef.current) return;
    try {
      const newState = !isMicOn;
      await callObjectRef.current.setLocalAudio(newState);

      // Verify the state was actually changed
      const localP = callObjectRef.current.participants().local;
      const actualState = localP?.audio ?? newState;
      setIsMicOn(actualState);
      showToast(actualState ? "Microphone on" : "Microphone off", "info");
    } catch (err) {
      console.error("Toggle mic error:", err);
      showToast(
        err.message || "Failed to toggle microphone. Please check permissions.",
        "error"
      );
      // Revert to actual state
      const localP = callObjectRef.current?.participants().local;
      if (localP) setIsMicOn(localP.audio);
    }
  };

  const handleToggleCamera = async () => {
    if (!callObjectRef.current) return;
    try {
      const newState = !isCameraOn;
      await callObjectRef.current.setLocalVideo(newState);

      // Verify the state was actually changed
      const localP = callObjectRef.current.participants().local;
      const actualState = localP?.video ?? newState;
      setIsCameraOn(actualState);
      showToast(actualState ? "Camera on" : "Camera off", "info");
    } catch (err) {
      console.error("Toggle camera error:", err);
      showToast(
        err.message || "Failed to toggle camera. Please check permissions.",
        "error"
      );
      // Revert to actual state
      const localP = callObjectRef.current?.participants().local;
      if (localP) setIsCameraOn(localP.video);
    }
  };

  const handleToggleScreenShare = async () => {
    if (!callObjectRef.current) return;
    try {
      if (isScreenSharing) {
        await callObjectRef.current.stopScreenShare();
        setIsScreenSharing(false);
        showToast("Screen sharing stopped", "info");
      } else {
        await callObjectRef.current.startScreenShare();
        setIsScreenSharing(true);
        showToast("Screen sharing started", "success");
      }
    } catch (err) {
      console.error("Toggle screen share error:", err);
      if (err.errorMsg?.includes("permission")) {
        showToast("Screen sharing permission denied", "error");
      } else {
        showToast(err.message || "Failed to toggle screen share", "error");
      }
      // Revert state on error
      setIsScreenSharing(false);
    }
  };

  const handleLeaveMeeting = async () => {
    try {
      if (callObjectRef.current) {
        await callObjectRef.current.leave();
      }
      if (!leaveNotifiedRef.current) {
        leaveNotifiedRef.current = true;
        await authFetch(`/api/channels/${channelId}/meetings/leave`, {
          method: "POST",
        });
      }
      handleLeaveMeetingUI();
      await fetchMeetingStatus();
      showToast("Left meeting successfully", "info");
    } catch (err) {
      showToast(err.message || "Failed to leave meeting", "error");
    }
  };

  const handleLeaveMeetingUI = () => {
    if (callObjectRef.current) {
      callObjectRef.current.destroy();
      callObjectRef.current = null;
    }
    leaveNotifiedRef.current = false;
    setIsInMeeting(false);
    setParticipants({});
    setLocalParticipant(null);
    setScreenShare(null);
    setIsMicOn(true);
    setIsCameraOn(true);
    setIsScreenSharing(false);
    if (onMeetingStateChange) {
      onMeetingStateChange(false);
    }
  };

  const handleEndMeeting = async () => {
    if (
      !window.confirm("Are you sure you want to end this meeting for everyone?")
    ) {
      return;
    }

    try {
      await authFetch(`/api/channels/${channelId}/meetings/end`, {
        method: "PATCH",
      });
      handleLeaveMeetingUI();
      await fetchMeetingStatus();
      showToast("Meeting ended successfully", "success");
    } catch (err) {
      showToast(err.message || "Failed to end meeting", "error");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading && !meeting) {
    return (
      <>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        </div>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={closeToast}
          />
        )}
      </>
    );
  }

  // If in meeting, show custom video interface
  if (isInMeeting) {
    const participantCount =
      Object.keys(participants).length + (localParticipant ? 1 : 0);

    const mainParticipant =
      screenShare || localParticipant || Object.values(participants)[0];
    const mainParticipantIsLocal =
      !!mainParticipant &&
      !!localParticipant &&
      mainParticipant.session_id === localParticipant.session_id;
    const mainParticipantIsScreenShare =
      !!screenShare && mainParticipant === screenShare;

    if (isMinimized) {
      return (
        <>
          <div
            className="pointer-events-none fixed z-40 w-[22rem] max-w-[92vw]"
            style={{ left: pipPosition.x, top: pipPosition.y }}
          >
            <div className="pointer-events-auto overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
              <div
                className="flex items-center justify-between bg-gray-800 px-3 py-2 cursor-move select-none"
                onMouseDown={handleDragStart}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400">In a meeting</p>
                    <p className="truncate text-sm font-semibold text-white">
                      {meeting?.title || "Channel Meeting"}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {participantCount} participant
                      {participantCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleMinimizeToggle}
                    className="rounded-lg bg-gray-700 px-2 py-1 text-xs font-semibold text-white hover:bg-gray-600"
                    title="Expand meeting"
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
                        d="M8 10l4-4 4 4M8 14l4 4 4-4"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={handleLeaveMeeting}
                    className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
                    title="Leave meeting"
                  >
                    Leave
                  </button>
                </div>
              </div>

              <div className="h-48 bg-black">
                {mainParticipant ? (
                  <VideoTile
                    participant={mainParticipant}
                    isLocal={mainParticipantIsLocal}
                    isScreenShare={mainParticipantIsScreenShare}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-gray-400">
                    Waiting for video...
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between bg-gray-800 px-3 py-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleMic}
                    className={`rounded-lg p-2 text-xs font-semibold transition-colors ${
                      isMicOn
                        ? "bg-gray-700 text-white hover:bg-gray-600"
                        : "bg-red-600 text-white hover:bg-red-700"
                    }`}
                    title={isMicOn ? "Mute microphone" : "Unmute microphone"}
                  >
                    {isMicOn ? (
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
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      </svg>
                    ) : (
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
                          d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                        />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={handleToggleCamera}
                    className={`rounded-lg p-2 text-xs font-semibold transition-colors ${
                      isCameraOn
                        ? "bg-gray-700 text-white hover:bg-gray-600"
                        : "bg-red-600 text-white hover:bg-red-700"
                    }`}
                    title={isCameraOn ? "Turn off camera" : "Turn on camera"}
                  >
                    {isCameraOn ? (
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
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    ) : (
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
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleScreenShare}
                    className={`rounded-lg p-2 text-xs font-semibold transition-colors ${
                      isScreenSharing
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-gray-700 text-white hover:bg-gray-600"
                    }`}
                    title={
                      isScreenSharing ? "Stop sharing" : "Share screen"
                    }
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
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={closeToast}
            />
          )}
        </>
      );
    }

    return (
      <>
        <div className="flex flex-col h-full bg-gray-900 relative">
          {/* Header */}
          <div className="flex items-center justify-between bg-gray-800 text-white px-6 py-3 flex-shrink-0 border-b border-gray-700">
            <div className="flex items-center gap-4">
              <h3 className="font-semibold text-lg">
                {meeting?.title || "Channel Meeting"}
              </h3>
              <span className="text-sm text-gray-300">
                {participantCount} participant
                {participantCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={handleMinimizeToggle}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                title="Minimize meeting"
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
                    d="M4 18h16M9 10h6M7 6h10"
                  />
                </svg>
              </button>
              {/* Participants toggle */}
              <button
                onClick={() => setShowParticipants(!showParticipants)}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                title="Toggle participants"
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
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </button>

              {/* End meeting (admin only) */}
              {isChannelAdmin && (
                <button
                  onClick={handleEndMeeting}
                  className="px-4 py-2 bg-red-800 hover:bg-red-900 rounded-lg text-sm font-semibold transition-colors"
                >
                  End Meeting
                </button>
              )}
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* Video grid - fills entire area */}
            <div className="flex-1 bg-gray-900 overflow-hidden">
              <VideoGrid
                participants={participants}
                localParticipant={localParticipant}
                screenShare={screenShare}
              />
            </div>

            {/* Participants sidebar */}
            {showParticipants && (
              <MeetingParticipants
                participants={participants}
                localParticipant={localParticipant}
                onClose={() => setShowParticipants(false)}
              />
            )}
          </div>

          {/* Controls - Positioned absolutely at bottom of video area */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <MeetingControls
              onToggleMic={handleToggleMic}
              onToggleCamera={handleToggleCamera}
              onToggleScreenShare={handleToggleScreenShare}
              onLeave={handleLeaveMeeting}
              isMicOn={isMicOn}
              isCameraOn={isCameraOn}
              isScreenSharing={isScreenSharing}
            />
          </div>
        </div>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={closeToast}
          />
        )}
      </>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Video Meeting
      </h3>

      {!meeting ? (
        <div className="bg-gray-50 rounded-lg p-8">
          <div className="text-center mb-6">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <h4 className="mt-4 text-lg font-medium text-gray-900">
              No active meeting
            </h4>
            <p className="mt-1 text-sm text-gray-500">
              {isChannelAdmin
                ? "Start a video meeting to connect with your team"
                : "No meeting is currently in progress"}
            </p>
          </div>

          {isChannelAdmin && (
            <div className="max-w-md mx-auto">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meeting Title (Optional)
                </label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g., Daily Standup, Sprint Planning"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <button
                onClick={handleStartMeeting}
                disabled={isStarting}
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                {isStarting ? "Starting..." : "Start Meeting"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 rounded-full p-3">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {meeting.title || "Channel Meeting"}
                </h4>
                <p className="text-sm text-gray-500">
                  Started at {formatDate(meeting.startedAt)}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              <span className="h-2 w-2 bg-green-600 rounded-full animate-pulse"></span>
              Live
            </span>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Active Participants:</p>
            <div className="flex flex-wrap gap-2">
              {meeting.participants
                ?.filter((p) => !p.leftAt)
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1"
                  >
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">
                      {p.User?.fullName || "Unknown"}
                    </span>
                  </div>
                ))}
            </div>
            {(!meeting.participants ||
              meeting.participants.filter((p) => !p.leftAt).length === 0) && (
              <p className="text-sm text-gray-400">No one has joined yet</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleJoinMeeting}
              disabled={isJoining}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
              {isJoining ? "Joining..." : "Join Meeting"}
            </button>

            {isChannelAdmin && (
              <button
                onClick={handleEndMeeting}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold text-white"
              >
                End Meeting
              </button>
            )}
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={closeToast} />
      )}
    </div>
  );
}

export default ChannelMeeting;
