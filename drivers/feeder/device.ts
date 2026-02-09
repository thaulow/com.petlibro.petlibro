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

    // Register button handler for manual feed
    this.registerCapabilityListener('manual_feed', async () => {
      await this.triggerManualFeed(1);
    });

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

      this.log(`Polling device ${this.serial}...`);

      let realInfo: any;
      let grainStatus: any;

      try {
        realInfo = await api.getDeviceRealInfo(this.serial);
        this.log('realInfo response:', JSON.stringify(realInfo));
      } catch (err) {
        this.error('Failed to get realInfo:', err);
        return;
      }

      try {
        grainStatus = await api.getGrainStatus(this.serial);
        this.log('grainStatus response:', JSON.stringify(grainStatus));
      } catch (err) {
        this.error('Failed to get grainStatus:', err);
      }

      // Online status
      if (realInfo.online === false) {
        if (this.getAvailable()) {
          await this.setUnavailable('Device is offline');
          this.homey.flow.getDeviceTriggerCard('device_offline')
            .trigger(this, {}, {}).catch(() => {});
        }
        return;
      }

      if (!this.getAvailable()) {
        await this.setAvailable();
      }

      // Battery (only for battery-powered devices)
      const battery = realInfo.electricQuantity;
      if (battery !== undefined && battery !== null && battery > 0) {
        if (!this.hasCapability('measure_battery')) {
          await this.addCapability('measure_battery');
          await this.addCapability('alarm_battery');
        }
        await this.setCapabilityValue('measure_battery', battery).catch(() => {});
        await this.setCapabilityValue('alarm_battery', battery < 15).catch(() => {});
      } else if (this.hasCapability('measure_battery')) {
        await this.removeCapability('measure_battery');
        await this.removeCapability('alarm_battery');
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
        if (grainStatus.todayFeedingQuantity !== undefined) {
          await this.setCapabilityValue(
            'feeding_today_amount',
            grainStatus.todayFeedingQuantity,
          ).catch(() => {});
        }
        if (grainStatus.todayFeedingTimes !== undefined) {
          await this.setCapabilityValue(
            'feeding_today_times',
            grainStatus.todayFeedingTimes,
          ).catch(() => {});
        }
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

      this.log('Poll complete');
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
