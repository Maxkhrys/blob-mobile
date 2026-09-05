import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { AppState } from "react-native";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";
import { useAppStore } from "../../store/AppContext";
type Kind = "tick" | "click" | "success";
const Context = createContext<(kind?: Kind) => void>(() => {});
export const useFeedback = () => useContext(Context);
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const { profile, device } = useAppStore();
  const tick = useAudioPlayer(require("../../../assets/audio/tick.wav"));
  const click = useAudioPlayer(require("../../../assets/audio/click.wav"));
  const success = useAudioPlayer(require("../../../assets/audio/success.wav"));
  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      interruptionMode: "mixWithOthers",
    }).catch(() => {});
  }, []);
  const feedback = useCallback(
    (kind: Kind = "tick") => {
      if (AppState.currentState && AppState.currentState !== "active") return;
      if (profile.haptics) {
        const action =
          kind === "success"
            ? Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              )
            : Haptics.selectionAsync();
        void action.catch(() => {});
      }
      if (profile.uiSounds) {
        const player =
          kind === "success" ? success : kind === "click" ? click : tick;
        Object.assign(player, { volume: 0.18 }); // Expo Audio uses an imperative native volume setter.
        void player
          .seekTo(0)
          .then(() => player.play())
          .catch(() => {});
      }
    },
    [profile.haptics, profile.uiSounds, tick, click, success],
  );
  const previous = React.useRef(device.state);
  useEffect(() => {
    if (previous.current !== "Connected" && device.state === "Connected")
      feedback("success");
    previous.current = device.state;
  }, [device.state, feedback]);
  useEffect(() => {
    if (!profile.uiSounds) {
      tick.pause();
      click.pause();
      success.pause();
    }
  }, [profile.uiSounds, tick, click, success]);
  return <Context.Provider value={feedback}>{children}</Context.Provider>;
}
