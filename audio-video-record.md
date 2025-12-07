# Audio+Video Recording System - v2.0 Implementation

## Overview
Autonomous stream/lecture recording system with streaming architecture for audio+video capture. Records CDP (Chrome DevTools Protocol) frames directly to FFmpeg stdin with PulseAudio virtual sink for audio, supporting recordings of any duration with automatic 20-minute chunk rotation.

## Architecture

### Core Components

#### 1. **AudioSetup Service** (`server/services/recording/audioSetup.ts`)
- Bootstraps PulseAudio daemon on startup
- Creates virtual sink (`recording_sink`) using `module-null-sink`
- Gracefully handles PulseAudio unavailability (non-blocking initialization)
- Returns `{ audioAvailable: boolean }` to indicate successful setup

**Key Implementation Details:**
- `initialize()`: Starts PulseAudio daemon, probes for module availability
- `createVirtualSink()`: Checks for existing sink, creates if needed
  - Treats "sink not found" from grep as non-fatal
  - Only rejects on actual `pactl` execution errors
- `getSinkName()`: Returns monitor device name for FFmpeg input (`recording_sink.monitor`)

#### 2. **StreamingRecorder Service** (`server/services/recording/streamingRecorder.ts`)
Real-time CDP frame streaming to FFmpeg with audio muxing.

**Streaming Pipeline:**
```
Chromium (CDP)
    ↓ (JPEG frames)
FFmpeg stdin (-f mjpeg -i pipe:0)
    ↓
PulseAudio sink (-f pulse -i recording_sink.monitor)
    ↓
libvpx-vp9 + libopus encoding
    ↓
WebM container (.webm)
```

**Key Methods:**
- `initialize()`: Calls `audioSetup.initialize()`, returns `{ audioAvailable: boolean }`
- `startBrowser()`: Launches Chromium with headless flags + audio routing
- `navigateToStream(url, password)`: Navigates to target stream/lecture
- `recordStream(duration, outputPath)`: Main recording loop with streaming and chunking
- `stopRecording()`: Gracefully stops recording, returns `{ success, error }`

**Chromium Flags for Audio:**
- `--alsa-output-device=pulse`: Route audio to PulseAudio
- `--autoplay-policy=no-user-gesture-required`: Auto-play without user interaction
- Standard headless flags for Replit environment

**Backpressure Control:**
- `MAX_FRAME_BUFFER_SIZE = 150`: Maximum buffered frames before dropping
- `FRAME_DROP_THRESHOLD = 75%`: Drop oldest frames when buffer exceeds 75% capacity
- Prevents memory overflow during high frame rate periods

**FFmpeg Configuration:**
```bash
ffmpeg \
  -f mjpeg -i pipe:0 \                    # Video input (CDP frames)
  -f pulse -i recording_sink.monitor \    # Audio input (PulseAudio sink)
  -c:v libvpx-vp9 -crf 30 -b:v 2000k \   # VP9 codec
  -c:a libopus -b:a 128k \                # Opus codec
  -pix_fmt yuv420p \
  -y output.webm
```

#### 3. **TaskManager** (`server/services/recording/taskManager.ts`)
Queue management for recording tasks with 20-minute chunking.

**Key Responsibilities:**
- Validates recording initialization (audio availability logging)
- Manages task lifecycle: scheduled → recording → completed
- Handles multi-chunk recordings (20 min each)
- Validates FFmpeg output before marking success
- Updates database with task status and errors

**Recording Validation:**
1. FFmpeg process exit code (must be 0)
2. Output file existence
3. Output file size > 0
4. Frame count validation (if available)

**Error Handling:**
- Catches streaming errors
- Logs audio availability status
- Propagates failures to database
- Sets task status to "failed" with error message

#### 4. **RecordingScheduler** (`server/services/recording/scheduler.ts`)
Checks for scheduled tasks every minute, initiates recording at scheduled time.

**Workflow:**
1. Queries database for tasks with status "scheduled"
2. Checks if current time >= scheduled time
3. Calls `TaskManager.executeTask()` if ready
4. Logs execution progress

#### 5. **PlaylistGenerator** (`server/services/recording/playlistGenerator.ts`)
Creates HLS `.m3u8` playlists for multi-chunk recordings.

**Features:**
- Generates standard HLS manifest
- References all uploaded chunks with proper segment durations
- Supports seamless playback of multi-chunk recordings
- Calculates total duration from all segments

#### 6. **YandexDiskService** (`server/services/yandexDiskService.ts`)
Uploads recording chunks to Yandex.Disk immediately after capture.

**Operations:**
- Direct chunk upload after FFmpeg completion
- Retrieves file quota/status
- Generates public sharing links
- Handles upload retries and errors

### Database Schema

**Recording Tasks Table** (`recording_tasks`):
```typescript
{
  id: serial (primary key)
  userId: integer (foreign key to users)
  streamUrl: string
  streamPassword: string (encrypted)
  scheduledTime: timestamp
  duration: integer (minutes)
  totalParts: integer (20-min chunks)
  currentPart: integer (progress tracking)
  status: "scheduled" | "recording" | "completed" | "failed"
  error?: string
  startedAt?: timestamp
  completedAt?: timestamp
  parts: RecordingPart[] (JSON array with upload status)
  createdAt: timestamp
  updatedAt: timestamp
}
```

## API Endpoints

### User Endpoints
- `POST /api/recordings/schedule` - Schedule new recording
- `GET /api/recordings/tasks` - List user's tasks
- `GET /api/recordings/tasks/:id` - Get task details
- `DELETE /api/recordings/tasks/:id` - Cancel scheduled task

### Admin Endpoints
- `POST /api/recordings/trigger` - External trigger (cron-job.org)
- `GET /api/library/recording/yandex-disk/status` - Quota info

## System Dependencies

**Required Packages:**
- `ffmpeg`: Video/audio encoding
- `chromium`: Browser automation
- `playwright`: CDP interface
- `pulseaudio`: Audio capture daemon
- `pulseaudio-utils`: PulseAudio CLI tools
- `mesa`, `nss`, `libgbm`, `libxshmfence`: Chromium dependencies

**Installation:**
```bash
npm install
# System dependencies auto-installed via package setup
```

## Environment Variables

```
YANDEX_DISK_TOKEN=<token>           # Yandex.Disk API token
YANDEX_DISK_FOLDER_ID=<folder-id>  # Target folder ID
```

## UI Components

### RecordingModal (`client/src/components/library/RecordingModal.tsx`)

**Features:**
- URL + password input with validation
- Date/time picker for scheduling
- Duration selection (minutes)
- Save target selection (Yandex.Disk default)
- Real-time status display
- Error messaging

**Integration:**
- Accessible from Library page via "+ Записать трансляцию" button
- Supports form validation via react-hook-form
- Zod schema validation on client side

## Error Handling & Robustness

### Initialization Phase
- **PulseAudio unavailable:** Logs warning, continues with video-only recording
- **Chromium launch failure:** Task marked failed, error logged
- **Network/auth errors:** Retries with exponential backoff

### Recording Phase
- **Frame buffer overflow:** Drops oldest frames when exceeding threshold
- **FFmpeg timeout:** Gracefully stops after 30 minutes, uploads completed chunk
- **Output file validation:** Checks size/frame count before marking success

### Upload Phase
- **Network errors:** Retries upload with exponential backoff
- **Quota exceeded:** Logs error, task marked as partially completed
- **Missing chunk:** Playlist generation skips missing segments

## Limitations & Future Improvements

### Current Limitations
1. **Headless-only capture:** Replit environment doesn't support Xvfb GUI
2. **Audio capture fragility:** Depends on PulseAudio availability
3. **No real-time bitrate adjustment:** Fixed VP9 bitrate (2000k)
4. **Single-browser instance:** One recording at a time per process

### Potential Improvements
1. Implement adaptive bitrate encoding
2. Support parallel recording with multiple browser instances
3. Add raw TCP streaming option for low-latency scenarios
4. Implement chunk preview generation (thumbnails)
5. Add user-friendly progress notifications (WebSocket)
6. Support custom video codecs (H.264, AV1)

## Testing & Debugging

### Manual Testing
```typescript
// Start recording immediately (via API)
POST /api/recordings/schedule
{
  "streamUrl": "https://example.com/stream",
  "streamPassword": "pass123",
  "duration": 5,
  "scheduledTime": "now"
}

// Check task status
GET /api/recordings/tasks/:taskId

// Monitor logs
tail -f /tmp/logs/Start_application_*.log
```

### Debug Logs
- Recording: `🎬 Starting task execution`
- Audio: `Recording initialized - audio capture: available`
- FFmpeg: `✅ Recording completed and validated`
- Upload: `📤 Chunk uploaded to Yandex.Disk`

## Performance Metrics

- **Frame capture rate:** 30 FPS (CDP default)
- **Chunk size:** ~50-150 MB per 20 minutes (VP9 @ 2000k)
- **Memory usage:** ~300-500 MB per active recording
- **Startup time:** ~10-15 seconds (Chromium + audio init)
- **Upload speed:** Depends on network (async, doesn't block)

## Security Considerations

1. **Password encryption:** Stream passwords encrypted with AES-256-GCM
2. **Access control:** API endpoints require authentication + role-based checks
3. **File uploads:** Chunks uploaded to user's Yandex.Disk (isolated storage)
4. **Public sharing:** Only generated when explicitly requested
5. **No local storage:** Recordings immediately upload, no temp files remain

## Implementation History

### v1.0 (Initial)
- Framebuffer-based capture (memory-intensive)
- Single-chunk recordings

### v2.0 (Current)
- **Streaming architecture:** CDP frames piped directly to FFmpeg
- **Audio muxing:** PulseAudio virtual sink integration
- **Multi-chunk support:** Automatic 20-minute rotation
- **Backpressure control:** Frame dropping to prevent memory overflow
- **Error resilience:** Graceful degradation when audio unavailable
- **Yandex.Disk integration:** Immediate chunk upload
- **HLS playlist:** Seamless multi-chunk playback

## References

- [Playwright CDP Documentation](https://playwright.dev/docs/api/class-browser)
- [FFmpeg Audio/Video Encoding](https://ffmpeg.org/ffmpeg.html)
- [PulseAudio Architecture](https://www.freedesktop.org/wiki/Software/PulseAudio/)
- [WebM Container Format](https://www.webmproject.org/)
