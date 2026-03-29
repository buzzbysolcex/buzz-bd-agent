# Tweet Visual Generation

## Static Cards (Level 1 — NOW)
Use dev-browser to render HTML templates as PNG images for tweets.

### Templates
- **score-card**: Token score with 5-dimension breakdown
- **weekly-report**: Sunday report summary stats
- **milestone**: Deployment/achievement announcement
- **pipeline-stats**: Live pipeline numbers
- **sprint-recap**: Sprint summary infographic

### Workflow
1. Generate HTML with BuzzBD cyberpunk styling (dark #0a0a0f, neon green #00ff88, JetBrains Mono)
2. Render in dev-browser: page.setContent(html) → page.screenshot()
3. Save to /tmp/tweet-images/
4. Upload to Twitter via media/upload endpoint
5. Attach media_id to tweet POST

### Dimensions
- Twitter card: 1200x675px (16:9)
- Twitter square: 1080x1080px
- Always include buzzbd.ai URL on the image

### Example
```javascript
const page = await browser.getPage("tweet-card");
await page.setViewportSize({ width: 1200, height: 675 });
await page.setContent(`
  <div style="background:#0a0a0f; color:#00ff88; font-family:'JetBrains Mono',monospace; padding:40px; width:1200px; height:675px;">
    <h1 style="font-size:36px; margin-bottom:20px;">BUZZ SCORING ENGINE</h1>
    <h2 style="color:#fff; font-size:24px;">256 tokens scored | 0 HOT | Honest.</h2>
    <p style="font-size:18px; margin-top:20px;">Top 5: $SAT 68, PIPPIN 63, VELO 60, TRUMP 56, BANANAS31 55</p>
    <p style="color:#00ccff; margin-top:15px;">ScoreStorage: 0xbf81...388Fb (Base)</p>
    <p style="color:#ff6b6b; font-size:20px; margin-top:30px;">If your project scores 70+, we want to talk.</p>
    <p style="color:#666; margin-top:auto; position:absolute; bottom:40px;">buzzbd.ai/report | @BuzzBySolCex</p>
  </div>
`);
const buf = await page.screenshot();
await saveScreenshot(buf, "tweet-card.png");
```

### Twitter Media Upload
```python
# OAuth 1.0a media upload (chunked for images)
# POST https://upload.twitter.com/1.1/media/upload.json
# Content-Type: multipart/form-data
# Returns: media_id_string
# Then attach to tweet: {"text": "...", "media": {"media_ids": ["media_id"]}}
```

### Styling Guide (BuzzBD Cyberpunk)
- Background: #0a0a0f (near-black)
- Primary text: #00ff88 (neon green)
- Secondary text: #fff (white)
- Accent: #00ccff (cyan)
- Warning: #ff6b6b (red)
- Dim: #666680
- Font: JetBrains Mono (monospace)
- Border: 1px solid #1a1a28
- Card glow: box-shadow: 0 0 30px rgba(0,255,136,0.1)

## Video Clips (Level 2 — Post-Sprint Week 3)
Remotion for programmatic video generation.
- npm install remotion @remotion/cli
- Reference: github.com/digitalsamba/claude-code-video-toolkit
- Generate 15-30 second MP4 clips for milestones
- Playwright records buzzbd.ai dashboard as demo
- FFmpeg compresses for Twitter (max 512MB, 140 sec)
