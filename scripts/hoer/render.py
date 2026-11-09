#!/usr/bin/env python3
"""Render a listening scene («Подслушанный разговор») for Mein Deutsch.

  python3 scripts/hoer/render.py scene.json OUTDIR

scene.json: {"id": "hoer-hafen", "bg": "sound prompt or null",
             "lines": [{"who": "Mia", "voice": "<voice_id>", "de": "...", "tag": "[lacht]"?}]}
ElevenLabs text-to-dialogue (eleven_v3, with timestamps) → optional ambience
(sound-generation) mixed under → mono 64 kbps mp3 → Scribe check.
Writes OUTDIR/<id>.mp3, OUTDIR/<id>.json {dur, t:[[start,end],…]} and OUTDIR/<id>.check.txt.
The proxy injects the API key (header value is a dummy)."""
import base64, json, subprocess, sys, os, re
H = ["-H", "xi-api-key: dummy"]
API = "https://api.elevenlabs.io"
DELAY = 0.8  # seconds of ambience before the first line


def curl(args, out=None):
    cmd = ["curl", "-sS", "--fail-with-body"] + H + args
    if out:
        cmd += ["-o", out]
    r = subprocess.run(cmd, capture_output=True, text=out is None)
    if r.returncode:
        sys.exit(f"API error: {r.stdout if out is None else open(out, errors='ignore').read()[:400]}")
    return r.stdout


def main(src, outdir):
    sc = json.load(open(src))
    os.makedirs(outdir, exist_ok=True)
    sid = sc["id"]
    tmp = os.path.join(outdir, sid + ".tmp")
    os.makedirs(tmp, exist_ok=True)
    body = {"model_id": "eleven_v3", "inputs": [
        {"voice_id": l["voice"], "text": (l.get("tag", "") + " " + l["de"]).strip()} for l in sc["lines"]]}
    json.dump(body, open(f"{tmp}/req.json", "w"))
    res = json.loads(curl([f"{API}/v1/text-to-dialogue/with-timestamps", "-H", "Content-Type: application/json",
                           "-d", f"@{tmp}/req.json"]))
    open(f"{tmp}/voice.mp3", "wb").write(base64.b64decode(res["audio_base64"]))
    seg = {}
    for s in res["voice_segments"]:
        i = s["dialogue_input_index"]
        a, b = s["start_time_seconds"], s["end_time_seconds"]
        seg[i] = [min(seg.get(i, [a, b])[0], a), max(seg.get(i, [a, b])[1], b)]
    times = [[round(seg[i][0] + DELAY, 2), round(seg[i][1] + DELAY, 2)] for i in range(len(sc["lines"]))]
    vdur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"{tmp}/voice.mp3"]))
    total = vdur + DELAY + 1.2
    if sc.get("bg"):
        curl([f"{API}/v1/sound-generation", "-H", "Content-Type: application/json", "-d",
              json.dumps({"text": sc["bg"], "duration_seconds": min(22, round(total)), "prompt_influence": 0.4})], f"{tmp}/bg.mp3")
        gain = sc.get("bg_gain", 2.5)
        fil = (f"[0:a]volume={gain},atrim=0:{total:.2f},afade=t=in:d=0.8,afade=t=out:st={total-1.5:.2f}:d=1.5[bg];"
               f"[1:a]adelay={int(DELAY*1000)}|{int(DELAY*1000)}[v];[bg][v]amix=inputs=2:duration=longest:normalize=0,pan=mono|c0=0.5*c0+0.5*c1[m]")
        subprocess.check_call(["ffmpeg", "-y", "-v", "error", "-stream_loop", "3", "-i", f"{tmp}/bg.mp3", "-i", f"{tmp}/voice.mp3",
                               "-filter_complex", fil, "-map", "[m]", "-ac", "1", "-b:a", "64k", f"{outdir}/{sid}.mp3"])
    else:
        subprocess.check_call(["ffmpeg", "-y", "-v", "error", "-i", f"{tmp}/voice.mp3", "-af", f"adelay={int(DELAY*1000)}",
                               "-ac", "1", "-b:a", "64k", f"{outdir}/{sid}.mp3"])
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"{outdir}/{sid}.mp3"]))
    json.dump({"dur": round(dur, 2), "t": times}, open(f"{outdir}/{sid}.json", "w"))
    stt = json.loads(curl([f"{API}/v1/speech-to-text", "-F", "model_id=scribe_v1", "-F", "language_code=deu", "-F", f"file=@{tmp}/voice.mp3"]))
    norm = lambda s: re.sub(r"[^a-zäöüß ]", " ", s.lower()).split()
    want, got = norm(" ".join(l["de"] for l in sc["lines"])), norm(re.sub(r"\[[^\]]*\]", " ", stt["text"]))
    miss = [w for w in want if w not in got]
    open(f"{outdir}/{sid}.check.txt", "w").write(f"heard: {stt['text']}\nmissing words: {miss}\n")
    print(sid, f"{dur:.1f}s", os.path.getsize(f"{outdir}/{sid}.mp3") // 1024, "KB", "missing:", miss)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
