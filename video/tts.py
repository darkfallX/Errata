# Voice-over: one mp3 per scene + word timings (for captions and for syncing visuals).
#   python tts.py
import asyncio, json, os
import edge_tts

HERE = os.path.dirname(os.path.abspath(__file__))
script = json.load(open(os.path.join(HERE, "script.json"), encoding="utf-8"))
out = os.path.join(HERE, "audio")
os.makedirs(out, exist_ok=True)

async def one(scene):
    comm = edge_tts.Communicate(scene["say"], script["voice"], rate=script["rate"], boundary="WordBoundary")
    words, audio = [], bytearray()
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            audio += chunk["data"]
        elif chunk["type"] == "WordBoundary":
            # offsets are in 100-ns units
            words.append({"t": chunk["offset"] / 1e7, "d": chunk["duration"] / 1e7, "w": chunk["text"]})
    open(os.path.join(out, f"{scene['id']}.mp3"), "wb").write(audio)
    json.dump(words, open(os.path.join(out, f"{scene['id']}.words.json"), "w", encoding="utf-8"), indent=1)
    print(scene["id"], len(words), "words")

import sys
async def main():
    only = set(sys.argv[1:])
    for s in script["scenes"]:
        if not only or s["id"] in only:
            await one(s)

asyncio.run(main())
