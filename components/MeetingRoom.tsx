'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { OwnCapability } from '@stream-io/video-client';
import Image from "next/image";
import {
  CallParticipantsList,
  CallStatsButton,
  CallingState,
  PaginatedGridLayout,
  ReactionsButton,
  RecordCallButton,
  SpeakerLayout,
  ScreenShareButton,
  DeviceSettings,
  ToggleAudioPublishingButton,
  ToggleVideoPublishingButton,
  useCall,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, LayoutList, MessagesSquare, Hand } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import Loader from './Loader';
import EndCallButton from './EndCallButton';
import MeetingChat from './MeetingChat';

type CallLayoutType = 'grid' | 'speaker-left' | 'speaker-right';

const LiveClock = () => {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="font-semibold text-white">
      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
};

const MeetingRoom = () => {
  const call = useCall();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isPersonalRoom = !!searchParams.get('personal');
  const [layout, setLayout] = useState<CallLayoutType>('speaker-left');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number>();
  const isLeavingRef = useRef(false);
  const { useCallCallingState, useHasPermissions, useLocalParticipant, useCallStartsAt } = useCallStateHooks();
  const localParticipant = useLocalParticipant();
  const callStartsAt = useCallStartsAt();
  const canManageCall = useHasPermissions?.(OwnCapability.UPDATE_CALL_PERMISSIONS) ?? false;
  const [meetingLink, setMeetingLink] = useState('');

  const meetingStartText = useMemo(() => {
    if (!callStartsAt) return 'Now';
    const date = new Date(callStartsAt);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, [callStartsAt]);

  const callLayout = useMemo(() => {
    switch (layout) {
      case 'grid':
        return <PaginatedGridLayout />;
      case 'speaker-right':
        return <SpeakerLayout participantsBarPosition="left" />;
      default:
        return <SpeakerLayout participantsBarPosition="right" />;
    }
  }, [layout]);

  const handleRaiseHand = async () => {
    if (!call) return;
    try {
      await call.sendReaction({ type: 'raised-hand', emoji_code: '✋' });
    } catch (error) {
      console.error('Failed to raise hand', error);
    }
  };

  const handleLeaveCall = async () => {
    if (!call || isLeavingRef.current) return;
    isLeavingRef.current = true;
    try {
      await call.leave();
    } catch (error) {
      console.error('Failed to leave call', error);
    } finally {
      router.push('/');
    }
  };

  // for more detail about types of CallingState see: https://getstream.io/video/docs/react/ui-cookbook/ringing-call/#incoming-call-panel
  const callingState = useCallCallingState();

  useEffect(() => {
    if (!call) return;

    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      const id = (call as any)?.id || (call as any)?.cid || '';
      if (id) setMeetingLink(`${origin}/meeting/${id}`);
    }

    const leaveOnce = async () => {
      if (isLeavingRef.current) return;
      isLeavingRef.current = true;
      try {
        await call.leave();
      } catch (error) {
        console.error('Failed to leave call on unload/disconnect', error);
      }
    };

    const handleBeforeUnload = () => {
      // Best-effort; cannot await in unload
      void leaveOnce();
    };

    const handleOffline = () => {
      void leaveOnce();
    };

    const offConnectionError = call.on('connection.error', leaveOnce);
    const offReconnectionFailed = call.on('connection.error', leaveOnce);

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('offline', handleOffline);
      if (typeof offConnectionError === 'function') offConnectionError();
      if (typeof offReconnectionFailed === 'function')
        offReconnectionFailed();
    };
  }, [call]);

  // Host notification for hand raises
  useEffect(() => {
    if (!call) return;

    const off = call.on('call.reaction_new', (event) => {
      const reaction = event?.reaction;
      if (!reaction) return;

      const isRaisedHand =
        reaction.type === 'raised-hand' ||
        reaction.emoji_code === ':raise-hand:' ||
        reaction.emoji_code === '✋';
      if (!isRaisedHand) return;
      if (!canManageCall) return;

      const senderId =
        (reaction as any)?.user?.id ||
        (reaction as any)?.user?.user_id ||
        (reaction as any)?.user_id ||
        undefined;
      const senderName = (reaction as any)?.user?.name || senderId || 'A participant';
      const isSelf = senderId && localParticipant?.userId === senderId;
      if (isSelf) return;

      toast({
        title: 'Hand raised',
        description: `${senderName} raised their hand`,
      });
    });

    return () => {
      if (typeof off === 'function') off();
    };
  }, [call, canManageCall, localParticipant?.userId, toast]);

  // Notify participants when others join/leave
  useEffect(() => {
    if (!call) return;

    const getName = (participant: any) => {
      const user = participant?.user || {};
      return user.name || user.id || participant?.user_id || 'Someone';
    };

    const isSelf = (participant: any) => {
      const user = participant?.user || {};
      const id = user.id || participant?.user_id;
      return !!id && id === localParticipant?.userId;
    };

    const offJoined = call.on('call.session_participant_joined', (event) => {
      const participant = (event as any)?.participant;
      if (!participant || isSelf(participant)) return;
      const name = getName(participant);
      toast({ title: `${name} joined the meeting` });
    });

    const offLeft = call.on('call.session_participant_left', (event) => {
      const participant = (event as any)?.participant;
      if (!participant || isSelf(participant)) return;
      const name = getName(participant);
      toast({ title: `${name} left the meeting` });
    });

    return () => {
      if (typeof offJoined === 'function') offJoined();
      if (typeof offLeft === 'function') offLeft();
    };
  }, [call, localParticipant?.userId, toast]);

  useEffect(() => {
    if (!call) return;

    const handleVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        callingState !== CallingState.JOINED &&
        !isLeavingRef.current
      ) {
        call
          .join()
          .catch((err) => console.error('Failed to rejoin after tab change', err));
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [call, callingState]);

  useEffect(() => {
    const updateHeight = () => setViewportHeight(window.innerHeight);
    updateHeight();

    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const showLoading = callingState !== CallingState.JOINED;

  return (
    <section
      className="relative flex min-h-screen w-full flex-col bg-dark-1 text-white"
      style={viewportHeight ? { height: viewportHeight, minHeight: viewportHeight } : undefined}
    >
      {showLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-dark-1/80 backdrop-blur-sm">
          <Loader />
        </div>
      )}
      <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-hidden px-4 pb-24 pt-4">
        <div className="flex flex-1 min-h-0 min-w-0 flex-col gap-3 overflow-hidden lg:flex-row">
          <div className="flex-1 min-w-0 overflow-hidden rounded-2xl border border-dark-3/40 bg-dark-2/30 shadow-lg">
            <div className="flex h-full min-h-[280px] w-full items-stretch justify-center p-4">
              {callLayout}
            </div>
          </div>

          {showParticipants && (
            <div className="max-h-full min-h-0 w-full max-w-xl flex-shrink-0 overflow-hidden rounded-2xl border border-dark-3/50 bg-dark-2/50 p-3 shadow-lg lg:w-[280px] lg:min-w-[260px]">
              <CallParticipantsList onClose={() => setShowParticipants(false)} />
            </div>
          )}

          {showChat && (
            <MeetingChat className="max-h-full min-h-0 w-full max-w-xl flex-shrink-0 sm:w-[320px] lg:w-[360px] lg:min-w-[320px]" />
          )}
        </div>
      </div>

      {/* Controls bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-dark-3/60 bg-dark-1/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto  flex w-full max-w-8xl flex-wrap items-center justify-center gap-3">
          <div className="flex items-center mr-20 gap-3 rounded-2xl bg-dark-2/80 px-4 py-2 shadow-lg ring-1 ring-dark-3/70">
            <div className="flex flex-col text-xs sm:text-sm text-gray-200">
              <span className="text-gray-400">Current time</span>
              <LiveClock />
            </div>
            <div className="flex flex-col text-xs sm:text-sm text-gray-200">
              <span className="text-gray-400">Meeting time</span>
              <span className="font-semibold text-white">{meetingStartText}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-dark-2/80 px-3 py-2 shadow-lg ring-1 ring-dark-3/70">
            <button
              onClick={handleLeaveCall}
              className="flex h-11 p-4 items-center justify-center rounded-full bg-red-600 text-white shadow-lg ring-1 ring-red-700/50 transition hover:bg-red-700"
            >
              <Image
                src="/icons/hangup.svg"
                alt="Leave Call"
                width={20}
                height={20}
              />
            </button>
            <ToggleAudioPublishingButton />
            <ToggleVideoPublishingButton />
            <ScreenShareButton />
            <DeviceSettings />

          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-dark-2/80 px-3 py-2 shadow-lg ring-1 ring-dark-3/70">
            <DropdownMenu>
              <div className="flex items-center">
                <DropdownMenuTrigger className="cursor-pointer rounded-xl bg-[#19232d] p-2 hover:bg-[#253041]">
                  <LayoutList size={20} className="text-white" />
                </DropdownMenuTrigger>
              </div>
              <DropdownMenuContent className="border-dark-1 bg-dark-1 text-white">
                {[
                  { label: 'Grid', value: 'grid' },
                  { label: 'Speaker - Left', value: 'speaker-left' },
                  { label: 'Speaker - Right', value: 'speaker-right' },
                ].map((item) => (
                  <div key={item.value}>
                    <DropdownMenuItem
                      onClick={() => setLayout(item.value as CallLayoutType)}
                    >
                      {item.label}
                    </DropdownMenuItem>
                  
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <CallStatsButton />

            <RecordCallButton />

            <ReactionsButton />

            <button
              onClick={handleRaiseHand}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#19232d] transition hover:bg-[#253041]"
              aria-label="Raise hand"
            >
              <Hand size={20} className="text-white" />
            </button>

            <button
              onClick={() => setShowParticipants((prev) => !prev)}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#19232d] transition hover:bg-[#253041]"
            >
              <Users size={20} className="text-white" />
            </button>

            <button
              onClick={() => setShowChat((prev) => !prev)}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#19232d] transition hover:bg-[#253041]"
            >
              <MessagesSquare size={20} className="text-white" />
            </button>
          </div>

          {!isPersonalRoom && <EndCallButton />}

           <div className="flex items-center ml-20 gap-2 rounded-2xl bg-dark-2/80 px-3 py-2 shadow-lg ring-1 ring-dark-3/70">
            <div className="max-w-[220px] truncate text-xs text-gray-200" title={meetingLink}>
              {meetingLink || 'Link unavailable'}
            </div>
            <button
              onClick={() => {
                if (!meetingLink) return;
                void navigator.clipboard.writeText(meetingLink);
                toast({
                  title: "Link Copied",
                });
              }}
              className="flex h-9 items-center rounded-lg bg-[#19232d] px-3 text-xs font-medium text-white transition hover:bg-[#253041]"
            >
              <Image
                src="/icons/copy.svg"
                alt="Copy"
                width={20}
                height={20}
              />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MeetingRoom;
