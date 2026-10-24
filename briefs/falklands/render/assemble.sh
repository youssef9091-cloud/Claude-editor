#!/bin/bash
set -e
S=/home/user/Claude-editor/briefs/falklands/build
cd $S/chunks
printf "file 'c0.mp4'\nfile 'c1.mp4'\nfile 'c2.mp4'\nfile 'c3.mp4'\n" > list.txt
ffmpeg -v error -y -f concat -safe 0 -i list.txt -c copy video.mp4
ffmpeg -v error -y -i video.mp4 -i $S/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest $S/final.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate,nb_frames -of compact $S/final.mp4
