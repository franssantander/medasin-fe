"use client";

import { useEffect } from "react";
import type { AmbientSound } from "../type";

export function useAmbientNoise(sound: AmbientSound, playing: boolean) {
  useEffect(() => {
    if (!playing || sound === "off") return;

    const AudioContextClass = window.AudioContext;
    const context = new AudioContextClass();
    const length = context.sampleRate * 3;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    let pinkA = 0;
    let pinkB = 0;

    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1;
      if (sound === "white") data[index] = white;
      if (sound === "brown") {
        brown = (brown + 0.02 * white) / 1.02;
        data[index] = brown * 3.5;
      }
      if (sound === "pink") {
        pinkA = 0.99765 * pinkA + white * 0.099046;
        pinkB = 0.963 * pinkB + white * 0.2965164;
        data[index] = (pinkA + pinkB + white * 0.1848) * 0.2;
      }
    }

    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.value = 0.045;
    source.connect(gain).connect(context.destination);
    source.start();
    void context.resume();

    return () => {
      source.stop();
      void context.close();
    };
  }, [playing, sound]);
}
