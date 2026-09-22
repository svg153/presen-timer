import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_VOLUME,
  loadSoundSettings,
  saveSoundSettings,
  type SoundPreferences
} from '@/utils/soundUtils';

/**
 * Sound preferences for the notification chime. Kept out of useTimer on purpose:
 * these are user preferences, not timer state, and useTimer only reads them to
 * decide whether/how loudly to chime.
 */
const useSoundSettings = () => {
  const [settings, setSettings] = useState<SoundPreferences>(loadSoundSettings);

  useEffect(() => {
    saveSoundSettings(settings);
  }, [settings]);

  const setVolume = useCallback((volume: number) => {
    setSettings(prev => ({ ...prev, volume }));
  }, []);

  const toggleMuted = useCallback(() => {
    setSettings(prev => ({ ...prev, muted: !prev.muted }));
  }, []);

  return { muted: false, volume: DEFAULT_VOLUME, ...settings, setVolume, toggleMuted };
};

export default useSoundSettings;
