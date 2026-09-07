/**
 * The whole authored catalogue, plus the small indexes the director needs.
 *
 * Building the indexes once at module load keeps the decision tick free of any
 * scanning that is not scoring, and gives the same fixed-array layout the
 * firmware port will use.
 */

import { V3_STORIES } from "./v3";
import { phaseCount } from "./authoring";
import { MICRO_STORIES } from "./micro";
import { IDLE_STORIES } from "./idle";
import { CURIOUS_STORIES } from "./curious";
import { HAPPY_STORIES } from "./happy";
import { SHY_STORIES } from "./shy";
import { SLEEPY_STORIES } from "./sleepy";
import { MISCHIEF_STORIES } from "./mischief";
import { SURPRISED_STORIES } from "./surprised";
import { ANNOYED_STORIES } from "./annoyed";
import { RARE_STORIES } from "./rare";
import { INTERACTION_STORIES } from "./interaction";
import type { StoryCategory, StoryDef } from "../types";

export const ALL_STORIES: readonly StoryDef[] = [
  ...V3_STORIES,
  ...MICRO_STORIES,
  ...IDLE_STORIES,
  ...CURIOUS_STORIES,
  ...HAPPY_STORIES,
  ...SHY_STORIES,
  ...SLEEPY_STORIES,
  ...MISCHIEF_STORIES,
  ...SURPRISED_STORIES,
  ...ANNOYED_STORIES,
  ...RARE_STORIES,
  ...INTERACTION_STORIES,
];

/** Everything the autonomous director can choose between thoughts. */
export const PERFORMANCE_STORIES: readonly StoryDef[] = ALL_STORIES.filter(
  (def) => def.category !== "MICRO"
);

export const MICRO_LIFE_STORIES: readonly StoryDef[] = ALL_STORIES.filter(
  (def) => def.category === "MICRO"
);

export const STORY_BY_ID: ReadonlyMap<string, StoryDef> = new Map(
  ALL_STORIES.map((def) => [def.id, def])
);

export const STORIES_BY_CATEGORY: ReadonlyMap<StoryCategory, StoryDef[]> =
  ALL_STORIES.reduce((map, def) => {
    const list = map.get(def.category);
    if (list) list.push(def);
    else map.set(def.category, [def]);
    return map;
  }, new Map<StoryCategory, StoryDef[]>());

/** Phase count per story, resolved once for the story browser. */
export const STORY_PHASE_COUNT: ReadonlyMap<string, number> = new Map(
  ALL_STORIES.map((def) => [def.id, phaseCount(def)])
);

export const getStory = (id: string): StoryDef | undefined =>
  STORY_BY_ID.get(id);

export {
  MICRO_STORIES,
  IDLE_STORIES,
  CURIOUS_STORIES,
  HAPPY_STORIES,
  SHY_STORIES,
  SLEEPY_STORIES,
  MISCHIEF_STORIES,
  SURPRISED_STORIES,
  ANNOYED_STORIES,
  RARE_STORIES,
  INTERACTION_STORIES,
};
