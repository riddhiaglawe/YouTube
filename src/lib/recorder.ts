// MediaRecorder Helper for In-Call Recording

export class CallRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private startTime: number = 0;
  private timerInterval: NodeJS.Timeout | null = null;

  public isRecording: boolean = false;
  public durationSeconds: number = 0;

  constructor(private onDurationUpdate?: (seconds: number) => void) {}

  public start(stream: MediaStream): boolean {
    if (this.isRecording) return false;

    this.recordedChunks = [];
    let options: MediaRecorderOptions = { mimeType: "video/webm;codecs=vp9,opus" };
    if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
      options = { mimeType: "video/webm;codecs=vp8,opus" };
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options = { mimeType: "video/webm" };
      }
    }

    try {
      this.mediaRecorder = new MediaRecorder(stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // chunk every 1 sec
      this.isRecording = true;
      this.startTime = Date.now();
      this.durationSeconds = 0;

      this.timerInterval = setInterval(() => {
        this.durationSeconds = Math.floor((Date.now() - this.startTime) / 1000);
        if (this.onDurationUpdate) {
          this.onDurationUpdate(this.durationSeconds);
        }
      }, 1000);

      return true;
    } catch (err) {
      console.error("Failed to start MediaRecorder:", err);
      return false;
    }
  }

  public stop(): Promise<{ blob: Blob; url: string; duration: number }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        return reject(new Error("Recording is not active"));
      }

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
        }

        const mimeType = this.mediaRecorder?.mimeType || "video/webm";
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const duration = this.durationSeconds;

        resolve({ blob, url, duration });
      };

      try {
        this.mediaRecorder.stop();
      } catch (err) {
        reject(err);
      }
    });
  }
}
