'use strict';

import Homey from 'homey';
import { getDeviceType } from '../../lib/types';

class FountainDriver extends Homey.Driver {

  async onInit() {
    this.log('Petlibro Fountain driver initialized');
  }

  async onPair(session: Homey.Driver.PairSession) {
    session.setHandler('login', async (data: { username: string; password: string }) => {
      this.log('Pairing: login attempt');
      const app = this.homey.app as any;
      try {
        await app.setCredentials(data.username, data.password, 'US');
        return true;
      } catch (err) {
        this.error('Pairing: login failed', err);
        throw new Error('Login failed. Please check your email and password.');
      }
    });

    session.setHandler('list_devices', async () => {
      this.log('Pairing: listing fountain devices');
      const app = this.homey.app as any;
      const api = app.getApi();
      const devices = await api.listDevices();

      return devices
        .filter((d: any) => getDeviceType(d.productIdentifier) === 'fountain')
        .map((d: any) => ({
          name: d.name || d.productName || 'Petlibro Fountain',
          data: {
            id: d.deviceSn,
          },
          store: {
            serial: d.deviceSn,
            model: d.productIdentifier,
            modelName: d.productName,
            mac: d.mac,
          },
        }));
    });
  }

  async onRepair(session: Homey.Driver.PairSession) {
    session.setHandler('login', async (data: { username: string; password: string }) => {
      this.log('Repair: re-login attempt');
      const app = this.homey.app as any;
      try {
        await app.setCredentials(data.username, data.password, 'US');
        return true;
      } catch (err) {
        this.error('Repair: login failed', err);
        throw new Error('Login failed. Please check your email and password.');
      }
    });
  }

}

module.exports = FountainDriver;
