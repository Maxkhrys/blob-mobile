/**
 * Canonical Expression & Behaviour Catalog from LCDPROTO
 * Synchronized with LCDPROTO: lib/expressionCatalog.ts & lib/behaviours/types.ts
 */

export type ExpressionCategory =
  | "ALL"
  | "Action"
  | "Emotion"
  | "Gaze"
  | "Lids"
  | "Anime"
  | "Body"
  | "Mouth"
  | "Idle"
  | "Angry"
  | "Sad"
  | "Variants";

export interface ExpressionEntry {
  id: string;
  label: string;
  hint: string;
  category: ExpressionCategory;
}

export interface ExpressionGroup {
  id: ExpressionCategory;
  label: string;
  entries: readonly ExpressionEntry[];
}

export const HOME_EXPRESSION_GROUPS: readonly ExpressionGroup[] = [
  {
    id: "Action",
    label: "Big beats",
    entries: [
      { id: "SPIN_360", label: "360 spin", hint: "full turn", category: "Action" },
      { id: "JOY_HOP", label: "Joy hop", hint: "anticipate + land", category: "Action" },
      { id: "EXCITED_WIGGLE", label: "Excited wiggle", hint: "short jelly burst", category: "Action" },
      { id: "SURPRISE_POP", label: "Surprise pop", hint: "crouch + spring", category: "Action" },
      { id: "CURIOUS_DOUBLE_TAKE", label: "Double take", hint: "right → left → settle", category: "Action" },
      { id: "WALL_IMPACT_LEFT", label: "Wall hit left", hint: "hard squash", category: "Action" },
      { id: "WALL_IMPACT_RIGHT", label: "Wall hit right", hint: "hard squash", category: "Action" },
      { id: "CREEP_IN_LEFT", label: "Creep in left", hint: "peek from edge", category: "Action" },
      { id: "CREEP_IN_RIGHT", label: "Creep in right", hint: "peek from edge", category: "Action" },
      { id: "POP_OUT_IN", label: "Pop in", hint: "drop from above", category: "Action" },
      { id: "VANISH_REAPPEAR", label: "Vanish + reappear", hint: "emote return", category: "Action" },
      { id: "SHY_PEEK", label: "Shy peek", hint: "retreat + soft lids", category: "Action" },
      { id: "SLEEPY_YAWN", label: "Sleepy yawn", hint: "stretch + drop", category: "Action" },
    ],
  },
  {
    id: "Emotion",
    label: "Major emotions",
    entries: [
      { id: "HAPPY_BOUNCE", label: "Happy bounce", hint: "bright squish", category: "Emotion" },
      { id: "LAUGH_SQUISH", label: "Laugh squish", hint: "happy compression", category: "Emotion" },
      { id: "PLAYFUL_WINK", label: "Playful wink", hint: "wink + sway", category: "Emotion" },
      { id: "SHOCKED_RECOIL", label: "Shocked recoil", hint: "wide + retreat", category: "Emotion" },
      { id: "CONFUSED_TILT", label: "Confused tilt", hint: "crooked look", category: "Emotion" },
      { id: "SLEEPY_MELT", label: "Sleepy melt", hint: "down + soften", category: "Emotion" },
      { id: "PANIC_SHAKE", label: "Panic shake", hint: "quick wobble", category: "Emotion" },
      { id: "PROUD_STRETCH", label: "Proud stretch", hint: "lift + hold", category: "Emotion" },
      { id: "ANGRY_FLARE", label: "Angry flare", hint: "tilt + body pulse", category: "Emotion" },
      { id: "DIZZY_WOBBLE", label: "Dizzy wobble", hint: "off-balance loop", category: "Emotion" },
      { id: "LOVE_SPARKLE", label: "Love drift", hint: "soft gaze + sway", category: "Emotion" },
      { id: "EMBARRASSED_BLUSH", label: "Embarrassed", hint: "shy lids + pout", category: "Emotion" },
      { id: "DEADPAN_SIDE_EYE", label: "Side-eye", hint: "slow judgement", category: "Emotion" },
      { id: "TEARY_POUT", label: "Small pout", hint: "small + sad", category: "Emotion" },
    ],
  },
  {
    id: "Gaze",
    label: "Gaze",
    entries: [
      { id: "GLANCE_LEFT", label: "Glance left", hint: "eyes lead", category: "Gaze" },
      { id: "GLANCE_RIGHT", label: "Glance right", hint: "eyes lead", category: "Gaze" },
      { id: "LOOK_UP", label: "Look up", hint: "curious lift", category: "Gaze" },
      { id: "LOOK_DOWN", label: "Look down", hint: "soft retreat", category: "Gaze" },
      { id: "CURIOUS_TILT_LEFT", label: "Curious left", hint: "tilt + lean", category: "Gaze" },
      { id: "CURIOUS_TILT_RIGHT", label: "Curious right", hint: "tilt + lean", category: "Gaze" },
    ],
  },
  {
    id: "Lids",
    label: "Lids & eyes",
    entries: [
      { id: "NORMAL_BLINK", label: "Blink", hint: "single closure", category: "Lids" },
      { id: "DOUBLE_BLINK", label: "Double blink", hint: "quick repeat", category: "Lids" },
      { id: "SOFT_SQUINT", label: "Soft squint", hint: "both eyes", category: "Lids" },
      { id: "ONE_EYE_SQUINT_LEFT", label: "Left squint", hint: "asymmetric", category: "Lids" },
      { id: "ONE_EYE_SQUINT_RIGHT", label: "Right squint", hint: "asymmetric", category: "Lids" },
      { id: "CURIOUS_WIDE", label: "Curious wide", hint: "open + alert", category: "Lids" },
    ],
  },
  {
    id: "Anime",
    label: "Anime face",
    entries: [
      { id: "HAPPY_EYES", label: "Happy eyes", hint: "black eyes + lifted brows", category: "Anime" },
      { id: "EXCITED_EYES", label: "Excited eyes", hint: "wide black eyes", category: "Anime" },
      { id: "ANGRY_EYES", label: "Angry eyes", hint: "tilted brows + lids", category: "Anime" },
      { id: "SHY_EYES", label: "Shy eyes", hint: "soft lids + glance", category: "Anime" },
      { id: "SLEEPY_EYES", label: "Sleepy eyes", hint: "heavy lids", category: "Anime" },
      { id: "SAD_EYES", label: "Sad eyes", hint: "droop + frown", category: "Anime" },
      { id: "CONFUSED_EYES", label: "Confused eyes", hint: "uneven tilt", category: "Anime" },
      { id: "LOVE_EYES", label: "Love eyes", hint: "soft gaze", category: "Anime" },
      { id: "PANIC_EYES", label: "Panic eyes", hint: "wide gaze", category: "Anime" },
      { id: "DEADPAN_EYES", label: "Deadpan eyes", hint: "flat stare", category: "Anime" },
    ],
  },
  {
    id: "Body",
    label: "Jelly body",
    entries: [
      { id: "BODY_SETTLE", label: "Body settle", hint: "drop + recover", category: "Body" },
      { id: "TINY_SQUISH", label: "Tiny squish", hint: "quick compression", category: "Body" },
      { id: "SOFT_SWAY_LEFT", label: "Sway left", hint: "weight shift", category: "Body" },
      { id: "SOFT_SWAY_RIGHT", label: "Sway right", hint: "weight shift", category: "Body" },
      { id: "SIDE_SQUISH_LEFT", label: "Side squish left", hint: "volume shift", category: "Body" },
      { id: "SIDE_SQUISH_RIGHT", label: "Side squish right", hint: "volume shift", category: "Body" },
      { id: "TALL_STRETCH", label: "Tall stretch", hint: "upward pull", category: "Body" },
      { id: "JELLY_TWIST_LEFT", label: "Twist left", hint: "surface twist", category: "Body" },
      { id: "JELLY_TWIST_RIGHT", label: "Twist right", hint: "surface twist", category: "Body" },
      { id: "BREATH_STRETCH", label: "Breath stretch", hint: "slow inhale", category: "Body" },
    ],
  },
  {
    id: "Mouth",
    label: "Mouth",
    entries: [
      { id: "MOUTH_RELAX", label: "Relax", hint: "soft smile", category: "Mouth" },
      { id: "MOUTH_TWITCH", label: "Twitch", hint: "tiny asymmetry", category: "Mouth" },
      { id: "MOUTH_O", label: "Round O", hint: "open shape", category: "Mouth" },
      { id: "MOUTH_FLIP", label: "Frown", hint: "curve morph", category: "Mouth" },
    ],
  },
  {
    id: "Idle",
    label: "Idle life",
    entries: [
      { id: "IDLE_SOFT_BREATH", label: "Soft breath", hint: "quiet inhale", category: "Idle" },
      { id: "IDLE_LOOK_AROUND", label: "Look around", hint: "small glance", category: "Idle" },
      { id: "IDLE_SETTLE", label: "Idle settle", hint: "weight drops", category: "Idle" },
      { id: "CASUAL_SQUINT", label: "Casual squint", hint: "laid-back pause", category: "Idle" },
      { id: "LAZY_LOOK", label: "Lazy look", hint: "slow glance", category: "Idle" },
      { id: "SOFT_SIGH", label: "Soft sigh", hint: "settle + release", category: "Idle" },
    ],
  },
  {
    id: "Angry",
    label: "Angry",
    entries: [
      { id: "ANGRY_BROWS", label: "Angry brows", hint: "inner corners down", category: "Angry" },
      { id: "ANGRY_STARE", label: "Stare", hint: "tight + weighted", category: "Angry" },
      { id: "ANGRY_SQUINT", label: "Hard squint", hint: "side compression", category: "Angry" },
      { id: "ANGRY_TILT", label: "Angry tilt", hint: "one eye + twist", category: "Angry" },
    ],
  },
  {
    id: "Sad",
    label: "Sad",
    entries: [
      { id: "SAD_DOWNCAST", label: "Downcast", hint: "drop + frown", category: "Sad" },
      { id: "SAD_WOBBLE", label: "Small wobble", hint: "soft sway", category: "Sad" },
      { id: "SAD_SMALL", label: "Small sad", hint: "quiet retreat", category: "Sad" },
    ],
  },
  {
    id: "Variants",
    label: "Variants",
    entries: [
      { id: "SENSED_WORRIED", label: "Worried", hint: "down + frown + settle", category: "Variants" },
      { id: "SENSED_SURPRISED", label: "Surprised", hint: "wide + O + stretch", category: "Variants" },
    ],
  },
];

export const EXPRESSION_FILTERS: readonly ExpressionCategory[] = [
  "ALL",
  "Action",
  "Emotion",
  "Gaze",
  "Lids",
  "Anime",
  "Body",
  "Mouth",
  "Idle",
  "Angry",
  "Sad",
  "Variants",
];

export const ALL_BEHAVIOURS: readonly ExpressionEntry[] =
  HOME_EXPRESSION_GROUPS.flatMap((g) => g.entries);

export function getBehaviour(id: string): ExpressionEntry {
  return ALL_BEHAVIOURS.find((b) => b.id === id) ?? ALL_BEHAVIOURS[0];
}
