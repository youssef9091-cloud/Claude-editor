#!/bin/bash
# Full Falklands render with the v2 cast. Prereqs (once): build/fonts, build/geo/c10.json, build/prep (photos),
# build/lipsync.json (Rhubarb on vo16k.wav), build/rms25.json, and the cast rig from
# genghis-khan-cooled-the-planet (python3 -I engine/prep_cast.py).
set -e
R=/home/user/Claude-editor/briefs/falklands/render
B=/home/user/Claude-editor/briefs/falklands/build
cd $B
python3 $R/render.py sfx
T=$(python3 -c "import json;print(json.load(open('holds.json'))['T_new'])")
python3 $R/audio.py ../vo/falklands_vo_raw_tamer.mp3 sfx.json $T mix.wav holds.json
NF=$(python3 -c "import json,math;print(int(round(json.load(open('holds.json'))['T_new']*25)))")
mkdir -p chunks
Q=$(( (NF + 3) / 4 ))
for i in 0 1 2 3; do
  f0=$(( i * Q )); f1=$(( (i + 1) * Q )); [ $f1 -gt $NF ] && f1=$NF
  python3 $R/render.py render $f0 $f1 chunks/c$i.mp4 > chunks/c$i.log 2>&1 &
done
wait
bash $R/assemble.sh
cp final.mp4 /home/user/Claude-editor/briefs/falklands/Falklands_CourseAlSaree3_16x9_cast2.mp4
echo DONE
