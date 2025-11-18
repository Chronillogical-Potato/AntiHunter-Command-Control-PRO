import { useEffect, useState } from 'react';
import { MdEventNote, MdHub, MdNotificationsActive } from 'react-icons/md';

import {
  ALERTS_ADDON_EVENT,
  ALERTS_ADDON_STORAGE_KEY,
  SCHEDULER_ADDON_EVENT,
  SCHEDULER_ADDON_STORAGE_KEY,
  STRATEGY_ADDON_EVENT,
  STRATEGY_ADDON_STORAGE_KEY,
  getAlertsAddonEnabled,
  getSchedulerAddonEnabled,
  getStrategyAddonEnabled,
  setAlertsAddonEnabled,
  setSchedulerAddonEnabled,
  setStrategyAddonEnabled,
} from '../constants/addons';

export function AddonPage() {
  const [strategyEnabled, setStrategyEnabled] = useState<boolean>(() => getStrategyAddonEnabled());
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(() => getAlertsAddonEnabled());
  const [schedulerEnabled, setSchedulerEnabled] = useState<boolean>(() =>
    getSchedulerAddonEnabled(),
  );

  useEffect(() => {
    const syncStrategy = () => setStrategyEnabled(getStrategyAddonEnabled());
    const syncAlerts = () => setAlertsEnabled(getAlertsAddonEnabled());
    const syncScheduler = () => setSchedulerEnabled(getSchedulerAddonEnabled());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STRATEGY_ADDON_STORAGE_KEY) {
        syncStrategy();
      }
      if (event.key === ALERTS_ADDON_STORAGE_KEY) {
        syncAlerts();
      }
      if (event.key === SCHEDULER_ADDON_STORAGE_KEY) {
        syncScheduler();
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener(STRATEGY_ADDON_EVENT, syncStrategy);
    window.addEventListener(ALERTS_ADDON_EVENT, syncAlerts);
    window.addEventListener(SCHEDULER_ADDON_EVENT, syncScheduler);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(STRATEGY_ADDON_EVENT, syncStrategy);
      window.removeEventListener(ALERTS_ADDON_EVENT, syncAlerts);
      window.removeEventListener(SCHEDULER_ADDON_EVENT, syncScheduler);
    };
  }, []);

  const handleStrategyToggle = () => {
    const next = !strategyEnabled;
    setStrategyAddonEnabled(next);
    setStrategyEnabled(next);
  };

  const handleAlertsToggle = () => {
    const next = !alertsEnabled;
    setAlertsAddonEnabled(next);
    setAlertsEnabled(next);
  };

  const handleSchedulerToggle = () => {
    const next = !schedulerEnabled;
    setSchedulerAddonEnabled(next);
    setSchedulerEnabled(next);
  };

  return (
    <div className="page addon-page">
      <header className="page-header">
        <h1>Add-ons</h1>
        <p className="form-hint">Extend Command Center with experimental capabilities.</p>
      </header>
      <div className="addon-grid">
        <article className="config-card addon-card">
          <div className="addon-card__logo">
            <MdHub size={42} />
          </div>
          <h2>Strategy Advisor</h2>
          <p>Generate high-level coverage plans and mission overlays using current target data.</p>
          <div className="addon-card__notice">This addon is under active development.</div>
          <p className="form-hint">
            Activating this feature reveals the Strategy Advisor entry in the main navigation.
          </p>
          <div className="addon-card__actions">
            <button type="button" className="control-chip" onClick={handleStrategyToggle}>
              {strategyEnabled ? 'Deactivate add-on' : 'Activate add-on'}
            </button>
          </div>
        </article>

        <article className="config-card addon-card">
          <div className="addon-card__logo addon-card__logo--alerts">
            <MdNotificationsActive size={42} />
          </div>
          <h2>Alerts</h2>
          <p>Manage alert rules, routing, and webhook notifications for target detections.</p>
          <p className="form-hint">
            Toggle this add-on if you want to temporarily hide alert tooling from the interface.
          </p>
          <div className="addon-card__actions">
            <button type="button" className="control-chip" onClick={handleAlertsToggle}>
              {alertsEnabled ? 'Deactivate add-on' : 'Activate add-on'}
            </button>
          </div>
        </article>

        <article className="config-card addon-card">
          <div className="addon-card__logo addon-card__logo--scheduler">
            <MdEventNote size={42} />
          </div>
          <h2>Scheduler</h2>
          <p>Plan commands days in advance and automatically dispatch sequences based on time.</p>
          <p className="form-hint">
            Enable the scheduler when you need recurring tasks; disable it to keep the interface
            lightweight.
          </p>
          <div className="addon-card__actions">
            <button type="button" className="control-chip" onClick={handleSchedulerToggle}>
              {schedulerEnabled ? 'Deactivate add-on' : 'Activate add-on'}
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
