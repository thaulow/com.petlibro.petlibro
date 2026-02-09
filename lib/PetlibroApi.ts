'use strict';

import { PetlibroSession } from './PetlibroSession';
import { DeviceListItem, DeviceRealInfo, GrainStatus } from './types';

export class PetlibroApi {

  private session: PetlibroSession;

  constructor(session: PetlibroSession) {
    this.session = session;
  }

  async login(email: string, password: string): Promise<string> {
    return this.session.login(email, password);
  }

  async listDevices(): Promise<DeviceListItem[]> {
    const data = await this.session.request<DeviceListItem[]>('/device/device/list', {});
    return data ?? [];
  }

  async getDeviceRealInfo(serial: string): Promise<DeviceRealInfo> {
    return this.session.request<DeviceRealInfo>('/device/device/realInfo', {
      id: serial,
      deviceSn: serial,
    });
  }

  async getGrainStatus(serial: string): Promise<GrainStatus> {
    return this.session.request<GrainStatus>('/device/data/grainStatus', {
      id: serial,
      deviceSn: serial,
    });
  }

  async getDrinkWaterToday(serial: string): Promise<Record<string, unknown>> {
    return this.session.request<Record<string, unknown>>(
      '/data/deviceDrinkWater/todayDrinkData',
      { id: serial, deviceSn: serial },
    );
  }

  async setLightSwitch(serial: string, enable: boolean): Promise<void> {
    await this.session.request('/device/setting/updateLightSwitch', {
      deviceSn: serial,
      enable,
    });
  }

  async setSoundSwitch(serial: string, enable: boolean): Promise<void> {
    await this.session.request('/device/setting/updateSoundSwitch', {
      deviceSn: serial,
      enable,
    });
  }

  async triggerManualFeed(serial: string, portions: number): Promise<void> {
    await this.session.request('/device/device/manualFeeding', {
      deviceSn: serial,
      grainNum: portions,
      requestId: Date.now().toString(),
    });
  }

  getSession(): PetlibroSession {
    return this.session;
  }

}
