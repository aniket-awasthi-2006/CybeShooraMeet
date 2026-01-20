"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCall, useCallStateHooks } from "@stream-io/video-react-sdk";
import { MessagesSquare, Send } from "lucide-react";
import { v4 as uuid } from "uuid";

import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  userName: string;
  at: number;
}

const MeetingChat = ({ className = "" }: { className?: string }) => {
  const call = useCall();
  const { useLocalParticipant } = useCallStateHooks();
  const localParticipant = useLocalParticipant();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [value, setValue] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const seenMessageIds = useRef<Set<string>>(new Set());

  const displayName = useMemo(() => {
    const fromUser = (localParticipant as { user?: { name?: string } } | null)
      ?.user?.name;

    return (
      localParticipant?.name ||
      fromUser ||
      localParticipant?.userId ||
      "You"
    );
  }, [localParticipant]);

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      if (seenMessageIds.current.has(msg.id)) return prev;
      seenMessageIds.current.add(msg.id);
      return [...prev, msg];
    });
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    if (!call) return;

    const unsubscribe = call.on("custom", (event: any) => {
      const payload = event?.custom;
      if (!payload || payload.scope !== "chat" || !payload.text) return;

      const msg: ChatMessage = {
        id: payload.id || uuid(),
        text: payload.text,
        userId: payload.userId || "unknown",
        userName: payload.userName || "Guest",
        at: payload.at || Date.now(),
      };
      appendMessage(msg);
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [appendMessage, call]);

  const handleSend = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!call || !value.trim()) return;

    const msg: ChatMessage = {
      id: uuid(),
      text: value.trim(),
      userId: localParticipant?.userId || "me",
      userName: displayName,
      at: Date.now(),
    };

    appendMessage(msg);
    setValue("");

    try {
      await call.sendCustomEvent({ scope: "chat", ...msg });
    } catch (err) {
      // swallow to avoid crashing UI; optionally could show toast
      console.error("Failed to send chat message", err);
    }
  };

  return (
    <div
      className={`flex h-full w-[340px] flex-col rounded-2xl border border-dark-3/60 bg-dark-2/70 p-4 text-white shadow-xl backdrop-blur ${className}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-1/20 text-blue-100">
          <MessagesSquare size={18} />
        </div>
        <div>
          <p className="text-sm text-gray-200">Meeting chat</p>
          <p className="text-xs text-gray-400">Connected as {displayName}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl bg-dark-3/60 p-3 text-sm shadow-inner">
        {messages.length === 0 && (
          <p className="text-center text-gray-400">No messages yet.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-1 rounded-lg bg-dark-2/60 p-2">
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span className="font-semibold text-gray-200">{msg.userName}</span>
              <span>
                {new Date(msg.at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="text-gray-100">{msg.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="mt-3 flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Message the room"
          className="border-dark-3 bg-dark-3/70 text-white focus-visible:ring-blue-1"
        />
        <Button
          type="submit"
          className="bg-blue-1 text-white shadow-md transition hover:shadow-blue-500/30"
        >
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
};

export default MeetingChat;
