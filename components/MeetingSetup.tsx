'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DeviceSettings,
  VideoPreview,
  useCall,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';
import Image from 'next/image';
import Alert from './Alert';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';


const MeetingSetup = ({
  setIsSetupComplete,
}: {
  setIsSetupComplete: (value: boolean) => void;
}) => {
  // https://getstream.io/video/docs/react/guides/call-and-participant-state/#call-state
  const { useCallEndedAt, useCallStartsAt } = useCallStateHooks();
  const callStartsAt = useCallStartsAt();
  const callEndedAt = useCallEndedAt();
  const callTimeNotArrived =
    callStartsAt && new Date(callStartsAt) > new Date();
  const callHasEnded = !!callEndedAt;
  const { toast } = useToast();

  const call = useCall();

  if (!call) {
    throw new Error(
      'useStreamCall must be used within a StreamCall component.',
    );
  }

  // https://getstream.io/video/docs/react/ui-cookbook/replacing-call-controls/
  const [keepMicCamOn, setKeepMicCamOn] = useState(true);
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [micLevel, setMicLevel] = useState(0);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isSoundTesting, setIsSoundTesting] = useState(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>();

  const meetingTitle = useMemo(() => {
    const id = (call as any)?.id || (call as any)?.cid || 'Meeting';
    return `Meeting ${id}`;
  }, [call]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    const id = (call as any)?.id || (call as any)?.cid || '';
    if (!id) return;
    setMeetingLink(`${origin}/meeting/${id}`);
  }, [call]);

  useEffect(() => {
    if (keepMicCamOn) {
      call.camera.enable();
      call.microphone.enable();
    } else {
      call.camera.disable();
      call.microphone.disable();
    }
  }, [keepMicCamOn, call]);

  const stopMicTest = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = undefined;
    analyserRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    setIsMicTesting(false);
    setMicLevel(0);
  }, []);

  const startMicTest = useCallback(async () => {
    try {
      setMicError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((acc, val) => acc + val, 0) / data.length;
        setMicLevel(Math.min(1, avg / 128));
        rafRef.current = requestAnimationFrame(tick);
      };

      setIsMicTesting(true);
      tick();
    } catch (err) {
      console.error('Mic test failed', err);
      setMicError('Mic access blocked. Please allow microphone permissions.');
      stopMicTest();
    }
  }, [stopMicTest]);

  const playTestTone = useCallback(() => {
    try {
      setIsSoundTesting(true);
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
      osc.onended = () => {
        setIsSoundTesting(false);
        ctx.close().catch(() => undefined);
      };
    } catch (error) {
      console.error('Sound test failed', error);
      setIsSoundTesting(false);
    }
  }, []);

  useEffect(() => () => stopMicTest(), [stopMicTest]);

  if (callTimeNotArrived)
    return (
      <Alert
        title={`Your Meeting has not started yet. It is scheduled for ${callStartsAt.toLocaleString()}`}
      />
    );

  if (callHasEnded)
    return (
      <Alert
        title="The call has been ended by the host"
        iconUrl="/icons/call-ended.svg"
      />
    );

  const canJoin = consentAcknowledged;

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-dark-1 via-dark-2 to-[#0b1528] px-4 text-white">
      <div className="flex w-full max-w-6xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-1 flex-col items-center gap-4">
          <h1 className="text-center text-2xl font-bold">Setup</h1>
          <p className="max-w-xl text-center text-sm text-gray-300">
            Host reminder: the host can turn on your camera or microphone at any time to troubleshoot or manage the session. Only the host can view/hear you when forcibly enabled.
          </p>
          <VideoPreview />
          <div className="flex h-16 flex-wrap items-center justify-center gap-3 text-sm font-medium">
            <label className="flex items-center justify-center gap-2 rounded-lg bg-dark-3/60 px-3 py-2">
              <input
                type="checkbox"
                checked={keepMicCamOn}
                onChange={(e) => setKeepMicCamOn(e.target.checked)}
              />
              Keep mic & camera on to join
            </label>
            <DeviceSettings />
          </div>
          
          <label className="flex max-w-xl items-start gap-2 rounded-lg border border-dark-3/60 bg-dark-2/60 px-3 py-2 text-sm text-gray-200 shadow-md">
            <input
              type="checkbox"
              checked={consentAcknowledged}
              onChange={(e) => setConsentAcknowledged(e.target.checked)}
              className="mt-1"
            />
            <span>
              I understand that enabling camera/mic is required to join. I consent to the host being able to temporarily unmute or un-cam me; only the host will see/hear if that happens.
            </span>
          </label>
          <Button
            className="rounded-md bg-green-500 px-4 py-2.5 disabled:cursor-not-allowed disabled:bg-green-700/50"
            disabled={!canJoin}
            onClick={() => {
              call.join();

              setIsSetupComplete(true);
            }}
          >
            {canJoin ? 'Join meeting' : 'Acknowledge to join'}
          </Button>
        </div>


        <div className="w-full max-w-md h-full flex flex-col gap-6 justify-center">
        <div className="w-full max-w-md h-full max-h-[400px] self-center rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur md:w-96">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Meeting details</h2>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-gray-200">Ready</span>
          </div>
          <div className="space-y-10 text-sm mt-16 text-gray-200 ">
            <div className="flex items-center gap-6 justify-between">
              <span className="text-gray-300">Title</span>
              <span className="font-medium text-white">{meetingTitle}</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-gray-300">Scheduled</span>
              <span className="font-medium text-white">{callStartsAt ? new Date(callStartsAt).toLocaleString() : 'Now'}</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-gray-300">Meeting link</span>
              <div className="flex items-center mt-2 rounded-xl bg-dark-3/60 px-3 py-2 text-xs md:text-sm">
                <span className="truncate" title={meetingLink}>{meetingLink || 'Link not ready yet'}</span>
                <Button
                  type="button"
                  variant="secondary"
                  className="ml-auto h-8 px-3 text-xs"
                  onClick={() => {
                    if (!meetingLink) return;
                    void navigator.clipboard.writeText(meetingLink);
                    toast({
                      title: "Link Copied",
                    });
                  }}
                >
                  <Image src="/icons/copy.svg" alt="Copy" width={30} height={30} />
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full max-w-md h-full max-h-[250px] self-center rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur md:w-96">
            <div className="space-y-3 flex flex-col">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Mic test</p>
                <span className="text-xs text-gray-400">{isMicTesting ? 'Listening…' : 'Idle'}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-dark-3">
                <div
                  className="h-full rounded-full bg-green-500 transition-[width] duration-150"
                  style={{ width: `${Math.min(100, Math.round(micLevel * 100))}%` }}
                />
              </div>
              {micError && <p className="text-xs text-red-400">{micError}</p>}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={isMicTesting ? stopMicTest : startMicTest}
                >
                  {isMicTesting ? 'Stop mic test' : 'Start mic test'}
                </Button>
                <span className="text-xs text-gray-400">Speak to see level</span>
              </div>
            </div>

            <div className="space-y-3 mt-6 flex flex-col">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Incoming sound test</p>
                <span className="text-xs text-gray-400">{isSoundTesting ? 'Playing' : 'Ready'}</span>
              </div>
              <p className="text-xs text-gray-300">
                Plays a short tone to verify your speakers/headphones.
              </p>
              <Button
                type="button"
                size="sm"
                disabled={isSoundTesting}
                className="w-fit bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                onClick={playTestTone}
              >
                {isSoundTesting ? 'Playing…' : 'Play test tone'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MeetingSetup;
