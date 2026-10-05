# assets/music/

Place your raw audio files (`.mp3`, `.wav`, `.flac`, `.m4a`, `.aac`, `.ogg`) in this directory.

### Quick Usage

Run the converter script from project root:

```bash
# Convert all audio files in this folder to Opus
npm run convert:opus

# Or run directly with node
node scripts/opus-converter.mjs

# Convert a specific file
node scripts/opus-converter.mjs path/to/song.mp3

# Specify custom bitrate (default is 160k for music fidelity)
node scripts/opus-converter.mjs --bitrate 192k
```

Converted `.opus` files will be saved in `assets/music/converted/` ready to upload to Cloudflare R2 via `/music`.
