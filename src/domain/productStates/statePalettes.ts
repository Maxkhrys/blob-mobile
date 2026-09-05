/** LCDPROTO defines state accents, not a separate state-to-Cloud material map.
 * Preserve the selected canonical material; show state accent in surrounding UI.
 * Previous source-sync overrides mixed unsupported ad-hoc colours into palettes.
 */
import { ProductState } from "./types";
import { CloudColourConfig } from "../character/types";
export function getStateColourOverride(
  _state: ProductState,
): CloudColourConfig | null {
  return null;
}
