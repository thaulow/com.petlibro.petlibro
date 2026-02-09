'use strict';

import Homey from 'homey';

class FountainDevice extends Homey.Device {

  private pollInterval!: NodeJS.Timeout;
  private serial!: string;

  async onInit() {
    this.serial = this.getStoreValue('serial');
    this.log(`Fountain init: ${this.getName()} (${this.serial})`);

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

      const realInfo = await api.getDeviceRealInfo(this.serial);

      // Online status
      if (!realInfo.online) {
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

      // Water consumed today
      if (realInfo.todayTotalMl !== undefined) {
        await this.setCapabilityValue('water_today_ml', realInfo.todayTotalMl).catch(() => {});
      }

      // Filter remaining
      if (realInfo.remainingReplacementDays !== undefined) {
        await this.setCapabilityValue(
          'filter_remaining_days',
          realInfo.remainingReplacementDays,
        ).catch(() => {});
      }

      // Cleaning remaining
      if (realInfo.remainingCleaningDays !== undefined) {
        await this.setCapabilityValue(
          'cleaning_remaining_days',
          realInfo.remainingCleaningDays,
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

}

module.exports = FountainDevice;
