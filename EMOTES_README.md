# Emote System Setup

This document explains how to set up and use the emote system in the GUTS game.

## Compression Script

The emote compression script processes GIF files from the `emotes/` folder and compresses them to 200x200px.

### Prerequisites

1. Install dependencies in the frontend:
   ```bash
   cd frontend
   npm install
   ```

   This will install `sharp` which is required for image processing.

### Running the Compression Script

1. Place your original GIF files in the `emotes/` folder at the project root
2. Run the compression script:
   ```bash
   npm run compress-emotes
   ```

   Or from the project root:
   ```bash
   node scripts/compress-emotes.js
   ```

3. The script will:
   - Read all `.gif` files from the `emotes/` folder
   - Resize them to 200x200px (maintaining aspect ratio)
   - Optimize them for web use
   - Output them to `frontend/public/emotes/` as `emote-01.gif`, `emote-02.gif`, etc.

### Current Emotes

Currently, the system supports 18 emotes (emote-01.gif through emote-18.gif). To add more:

1. Add additional GIF files to the `emotes/` folder
2. Update the `emoteCount` variable in `frontend/src/components/EmotePicker.jsx`
3. Run the compression script again

## Using Emotes in Game

- **During Rounds**: Players can click on their own player tile in the player list to open the emote picker
- **Emote Display**: Emotes appear as overlays above player tiles and automatically fade out after 5 seconds
- **Anytime**: Emotes can be used at any time during a round (before or after making a decision)

## File Structure

```
GUTS/
├── emotes/                    # Source GIF files (original size)
│   ├── Animated GIF.gif
│   ├── Baby Niche GIF.gif
│   └── ...
├── scripts/
│   └── compress-emotes.js     # Compression script
└── frontend/
    └── public/
        └── emotes/            # Compressed output (200x200px)
            ├── emote-01.gif
            ├── emote-02.gif
            └── ...
```

