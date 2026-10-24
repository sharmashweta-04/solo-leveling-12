#!/usr/bin/env bash
# Re-creates public/media from the source video. Usage: scripts/video-prep.sh path/to/video.mp4
# Key moments in the original 10 s clip: flames+ARISE 0-3.3s, light streak 3.3s, flare peak 4.08s,
# near-black 4.85s (cut point), hologram globe 4.9-6.4s, data burst 6.4s, panel appears ~7.2s.
set -e; V="$1"; O=public/media; mkdir -p $O
ffmpeg -y -i "$V" -t 4.875 -af "afade=t=out:st=4.45:d=0.4" -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 96k $O/intro.mp4
ffmpeg -y -i "$V" -t 4.875 -af "afade=t=out:st=4.45:d=0.4" -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 -c:a libopus -b:a 80k $O/intro.webm
ffmpeg -y -ss 4.875 -to 7.1 -i "$V" -af "afade=t=in:d=0.15,afade=t=out:st=1.95:d=0.27" -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 96k $O/quest_arrival.mp4
ffmpeg -y -ss 4.875 -to 7.1 -i "$V" -af "afade=t=in:d=0.15,afade=t=out:st=1.95:d=0.27" -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 -c:a libopus -b:a 80k $O/quest_arrival.webm
ffmpeg -y -ss 0.5 -i "$V" -frames:v 1 -vf scale=540:-1 -c:v libwebp -quality 70 $O/intro_poster.webp
ffmpeg -y -ss 5.6 -i "$V" -frames:v 1 -vf scale=540:-1 -c:v libwebp -quality 70 $O/quest_arrival_poster.webp
# OPTIONAL: individual frames (only needed for scroll-scrubbing or per-frame control; much heavier than video):
# mkdir -p $O/frames && ffmpeg -y -i "$V" -vf "fps=24,scale=360:-1" -c:v libwebp -quality 60 $O/frames/f_%03d.webp
