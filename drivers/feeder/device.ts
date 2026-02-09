'use strict';

import Homey from 'homey';

class FeederDevice extends Homey.Device {

  private pollInterval!: NodeJS.Timeout;
  private serial!: string;

  async onInit() {
    this.serial = this.getStoreValue('serial');
    this.log(`Feeder init: ${this.getName()} (${this.serial})`);

    // Populate settings with device info
    await this.setSettings({
      serial: this.serial,
      model: this.getStoreValue('modelName') || this.getStoreValue('model') || '',
    }).catch(() => {});

    // Initial poll
    await this.pollDeviceState();

    // Start polling every 60 seconds
    this.pollInterval = this.homey.setInterval(
      () => this.pollDeviceState().catch((err) => this.error('Poll failed:', err)),
      60_000,
    );
  }

  async onUninit() {
    if (this.pollInterval) {
      this.homey.clearInterval(this.pollInterval);
    }
  }

  private async pollDeviceState() {
    try {
      const app = this.homey.app as any;
      const api = app.getApi();

      const [realInfo, grainStatus] = await Promise.all([
        api.getDeviceRealInfo(this.serial),
        api.getGrainStatus(this.serial),
      ]);

      // Online status
      if (!realInfo.online) {
        if (this.getAvailable()) {
          await this.setUnavailable('Device is offline');
          await this.driver.ready();
          this.homey.flow.getDeviceTriggerCard('device_offline')
            .trigger(this, {}, {}).catch(() => {});
        }
        return;
      }

      if (!this.getAvailable()) {
        await this.setAvailable();
      }

      // Battery
      const battery = realInfo.electricQuantity ?? null;
      if (battery !== null) {
        await this.setCapabilityValue('measure_battery', battery).catch(() => {});
        await this.setCapabilityValue('alarm_battery', battery < 15).catch(() => {});
      }

      // Food level
      const previousFoodLevel = this.getCapabilityValue('food_level');
      const foodOk = realInfo.surplusGrain !== false;
      const newFoodLevel = foodOk ? 'ok' : 'low';
      await this.setCapabilityValue('food_level', newFoodLevel).catch(() => {});

      if (previousFoodLevel === 'ok' && newFoodLevel === 'low') {
        this.homey.flow.getDeviceTriggerCard('food_low')
          .trigger(this, {}, {}).catch(() => {});
      }

      // Feeding stats
      if (grainStatus) {
        await this.setCapabilityValue(
          'feeding_today_amount',
          grainStatus.todayFeedingQuantity ?? 0,
        ).catch(() => {});
        await this.setCapabilityValue(
          'feeding_today_times',
          grainStatus.todayFeedingTimes ?? 0,
        ).catch(() => {});
      }

      // Desiccant remaining
      if (realInfo.remainingDesiccantDays !== undefined) {
        await this.setCapabilityValue(
          'desiccant_remaining',
          realInfo.remainingDesiccantDays,
        ).catch(() => {});
      }

      // WiFi signal
      if (realInfo.wifiRssi !== undefined) {
        await this.setCapabilityValue('wifi_signal', realInfo.wifiRssi).catch(() => {});
      }
    } catch (err) {
      this.error('Failed to poll device state:', err);
    }
  }

  async triggerManualFeed(portions: number = 1) {
    const app = this.homey.app as any;
    const api = app.getApi();
    await api.triggerManualFeed(this.serial, portions);
    this.log(`Manual feed triggered: ${portions} portions`);
  }

}

module.exports = FeederDevice;
