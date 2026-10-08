// Web Audio API Utilities: Active Speaker Volume Detection & Noise Suppression

export class AudioVolumeAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;

  constructor(
    private stream: MediaStream,
    private onVolumeChange: (volume: number, isSpeaking: boolean) => void
  ) {
    this.init();
  }

  private init() {
    try {
      const audioTracks = this.stream.getAudioTracks();
      if (!audioTracks.length) return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.5;

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const volume = Math.min(100, Math.round((average / 128) * 100));
        const isSpeaking = volume > 15; // speaking threshold

        this.onVolumeChange(volume, isSpeaking);
        this.animationFrameId = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn("AudioVolumeAnalyzer error:", err);
    }
  }

  public stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Noise Suppression Web Audio Graph
export function createNoiseSuppressionStream(inputStream: MediaStream): {
  processedStream: MediaStream;
  cleanup: () => void;
} {
  const audioTracks = inputStream.getAudioTracks();
  if (!audioTracks.length) return { processedStream: inputStream, cleanup: () => {} };

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(inputStream);

    // Highpass filter (cuts rumbles below 80Hz)
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 80;

    // Lowpass filter (cuts rumbles above 8000Hz)
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 8000;

    // Dynamics Compressor (noise gate / smoothing)
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-50, ctx.currentTime);
    compressor.knee.setValueAtTime(40, ctx.currentTime);
    compressor.ratio.setValueAtTime(12, ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    compressor.release.setValueAtTime(0.25, ctx.currentTime);

    const destination = ctx.createMediaStreamDestination();

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(compressor);
    compressor.connect(destination);

    const processedAudioTrack = destination.stream.getAudioTracks()[0];
    const videoTracks = inputStream.getVideoTracks();

    const processedStream = new MediaStream([processedAudioTrack, ...videoTracks]);

    const cleanup = () => {
      try {
        source.disconnect();
        highpass.disconnect();
        lowpass.disconnect();
        compressor.disconnect();
        if (ctx.state !== "closed") ctx.close();
      } catch (e) {}
    };

    return { processedStream, cleanup };
  } catch (err) {
    console.warn("Noise suppression fallback to raw stream", err);
    return { processedStream: inputStream, cleanup: () => {} };
  }
}
