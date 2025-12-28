import { useEffect, useState } from "react";

const heroPhrases = ["Where work happens", "Where workspaces connect", "Channels spark ideas"];

const workspaces = [
  { name: "Marketing Squad", members: 18, color: "bg-blue-500" },
  { name: "HUST Lab R&D", members: 32, color: "bg-sky-600" },
];

const channels = [
  { name: "#general", unread: 4 },
  { name: "#hust", unread: 2 },
  { name: "#events", unread: 0 },
];

const highlights = [
  { label: "Workspace", value: "12+", desc: "Team management" },
  { label: "Channel", value: "58", desc: "Real-time collaboration" },
  { label: "Messages/day", value: "3.5K", desc: "Messages from Prisma schema" },
];

const sampleMessages = [
  {
    author: "Kuron",
    avatar: "KR",
    channel: "#general",
    text: "New plan approved, please roll it out!",
    time: "2m ago",
  },
  {
    author: "Viet Hung",
    avatar: "VH",
    channel: "#hust",
    text: "Demo workspace scheduled for 15:00.",
    time: "10m ago",
  },
];

function FeaturePreview({ variant = "scroll" }) {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % heroPhrases.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const wrapperClass =
    variant === "static"
      ? "order-2 flex flex-col rounded-2xl border border-sky-200 bg-gradient-to-br from-blue-600 to-sky-500 p-4 text-white shadow-lg lg:order-1 lg:p-6"
      : "order-2 flex max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-br from-blue-600 to-sky-500 p-4 text-white shadow-lg lg:order-1 lg:p-6";

  const bodyClass =
    variant === "static"
      ? "mt-4 space-y-4"
      : `mt-4 flex-1 space-y-4 overflow-y-auto ${
          variant === "hidden-scroll" ? "no-scrollbar" : "custom-scroll pr-1"
        }`;

  const bodyStyle =
    variant === "hidden-scroll"
      ? { scrollbarWidth: "none", msOverflowStyle: "none" }
      : undefined;

  return (
    <aside className={wrapperClass}>
      <div className="flex min-h-[150px] flex-col items-center justify-center rounded-xl bg-white/20 p-6 text-center backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.35em] text-sky-100">Where work happens</p>
        <h3 className="mt-4 text-4xl font-semibold leading-tight text-white">
          {heroPhrases[phraseIndex]}
        </h3>
      </div>

      <div className={bodyClass} style={bodyStyle}>
        <div className="grid gap-3 rounded-xl border border-white/20 bg-black/10 p-3">
          {workspaces.map((ws) => (
            <div
              key={ws.name}
              className={`rounded-xl ${ws.color} p-4 text-sm font-semibold shadow-md`}
            >
              <p className="text-base font-semibold text-white">{ws.name}</p>
              <p className="text-xs text-white/80">{ws.members} active members</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-xl bg-black/10 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Channels you follow</p>
            <span className="text-xs text-sky-100">Realtime sync</span>
          </div>
          <div className="space-y-2">
            {channels.map((channel) => (
              <div
                key={channel.name}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm"
              >
                <span>{channel.name}</span>
                {channel.unread > 0 && (
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-blue-600">
                    {channel.unread}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 rounded-xl bg-black/10 p-4">
          {sampleMessages.map((msg) => (
            <div key={msg.author} className="rounded-xl border border-white/10 bg-white/10 p-3 text-sm">
              <div className="mb-2 flex items-center justify-between text-xs text-sky-100">
                <span>{msg.channel}</span>
                <span>{msg.time}</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 font-semibold">
                  {msg.avatar}
                </div>
                <div>
                  <p className="font-semibold">{msg.author}</p>
                  <p className="text-white/90">{msg.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 rounded-xl bg-black/20 p-4">
          {highlights.map((highlight) => (
            <div key={highlight.label} className="flex-1">
              <p className="text-2xl font-semibold">{highlight.value}</p>
              <p className="text-sm text-white">{highlight.label}</p>
              <p className="text-xs text-sky-100">{highlight.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default FeaturePreview;
