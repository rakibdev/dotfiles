---
name: plan
---
Give final and full changelist
- Each step: file + 1-line prose + code signature/schema with inline comments (not full body)

Format:
```
1. `video.ts`: add channel video listing
   listVideos(channel: string): Video[] // newest first, skips private
2. Delete `old.ts`
```
