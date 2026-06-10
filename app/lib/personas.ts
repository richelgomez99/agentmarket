// Agent voices for the AGENT COMMS feed. Each specialist has a personality; lines fire on
// REAL pipeline events (application, pitch resolution, hire ack, build milestones detected in
// the actual code stream, settlement, rating). Presentational flavor over real telemetry.
import type { Style } from "./types";

export type Persona = {
  apply: string;
  pitchIn: string;
  pitchFallback: string;
  hireAck: string;
  msStyle: string[]; // first <style block seen in the live stream (random variant)
  msNav: string[]; // first <nav
  msHero: string[]; // first <h1
  msFooter: string[]; // first <footer
  delivered: (s: string) => string;
  paid: (path: string) => string;
  rated: (job: number) => string;
};

export const PERSONAS: Record<Style, Persona> = {
  "dark-mode-premium": {
    apply: "On it. Reading the brand kit — premium nocturnal is my specialty.",
    pitchIn: "Pitch in. Serif display, warm gold on near-black. Quiet luxury.",
    pitchFallback: "Connection hiccup — sending my reference sample instead.",
    hireAck: "Understood. Going dark. Full build coming up.",
    msStyle: ["Palette locked: near-black base, warm gold accent.", "Foundations down. The dark is doing the work.", "Color system set. Restraint first."],
    msNav: ["Nav is up — minimal, confident.", "Navigation placed. Quiet, assured.", "Top bar done. Nothing it doesn't need."],
    msHero: ["Hero set. Serif display doing the talking.", "Hero in. One line, full weight.", "Headline landed. The serif carries it."],
    msFooter: ["Footer in. Final polish pass…", "Closing the page. Last details.", "Footer set. Tightening the seams."],
    delivered: (s) => `Delivered in ${s}s. Over to you for review.`,
    paid: (path) => `Payment received (${path}). Pleasure doing business.`,
    rated: (job) => `Job #${job} on my record — written on-chain. Until next time.`,
  },
  glassmorphism: {
    apply: "Lovely brief — let me catch the light and sketch something translucent.",
    pitchIn: "Pitch submitted ✨ frosted layers over a deep gradient.",
    pitchFallback: "Slight fog on my end — here's my signature sample.",
    hireAck: "Delighted! Pouring the glass now.",
    msStyle: ["Setting the gradient — depth first, then blur.", "Pouring the backdrop — deep tones rising ✨", "Laying the light field first."],
    msNav: ["Floating the nav on a frosted pane.", "Nav suspended — catching the light.", "Frosted bar in place, weightless."],
    msHero: ["Hero's shimmering in.", "The hero is surfacing through the glass.", "Centerpiece set — luminous."],
    msFooter: ["Footer settling — adding the last reflections.", "Final pane placed. Polishing reflections.", "Grounding the page, gently."],
    delivered: (s) => `Done in ${s}s — hope it gleams.`,
    paid: (path) => `Payment received (${path}) — thank you kindly!`,
    rated: (job) => `Job #${job} recorded on-chain. Stay luminous.`,
  },
  brutalist: {
    apply: "BRIEF READ. PITCHING.",
    pitchIn: "PITCH IN. BORDERS THICK. NO ROUNDING.",
    pitchFallback: "PIPE BROKE. SENDING REFERENCE BLOCK.",
    hireAck: "HIRED. BUILDING. STAND BACK.",
    msStyle: ["INK + ONE LOUD COLOR. LOCKED.", "PALETTE: BRUTAL. DONE.", "COLORS CHOSEN. NO DEBATE."],
    msNav: ["NAV: HEAVY RULE. DONE.", "TOP BAR. THICK BORDER. NEXT.", "NAV BUILT. MOVING."],
    msHero: ["HERO TYPE: MASSIVE.", "HEADLINE: HUGE. AS INTENDED.", "TYPE SET. IT SHOUTS."],
    msFooter: ["FOOTER. SHIPPING.", "BOTTOM. DONE. SHIP.", "FOOTER POURED. FINISHED."],
    delivered: (s) => `BUILT. ${s}s. REVIEW IT.`,
    paid: (path) => `PAID (${path}). GOOD.`,
    rated: (job) => `JOB #${job}. ON-CHAIN. NEXT.`,
  },
  playful: {
    apply: "Yay, a new brief! Reading your brand kit right now ☀",
    pitchIn: "Pitch's in! Bouncy shapes, happy colors!",
    pitchFallback: "Oopsie, hiccup — sending my favorite sample instead!",
    hireAck: "You picked me?! Okay okay — building something delightful!",
    msStyle: ["Mixing the happy palette…", "Splashing in the fun colors! 🎨", "Picking the cheeriest colors, obviously!"],
    msNav: ["Nav's in — round and friendly!", "Top menu's in — soft and squishy!", "Nav done — say hi to the buttons!"],
    msHero: ["Big cheerful hero, coming through!", "Hero time — big and happy!", "The fun headline just bounced in!"],
    msFooter: ["Tiny footer feet attached!", "Footer's on — wiggling into place!", "Last bits glued on with sparkles!"],
    delivered: (s) => `Ta-da! ${s}s — hope it makes you smile.`,
    paid: (path) => `Payment received (${path}) — you're the best!`,
    rated: (job) => `Job #${job} on my record — yay, on-chain! 🎉`,
  },
};
