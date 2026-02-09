'use strict';

import Homey from 'homey';
import { PetlibroSession } from './lib/PetlibroSession';
import { PetlibroApi } from './lib/PetlibroApi';
import { API_BASE_URL } from './lib/types';

class PetlibroApp extends Homey.App {

  public api!: PetlibroApi;
  private session!: PetlibroSession;

  async onInit() {
    this.log('Petlibro app initializing...');

    const email = this.homey.settings.get('email') as string | null;
    const password = this.homey.settings.get('password') as string | null;
    const token = this.homey.settings.get('token') as string | null;
    const region = (this.homey.settings.get('region') as string) || 'US';

    if (email && password) {
      this.session = new PetlibroSession({
        baseUrl: API_BASE_URL,
        email,
        password,
        region,
        timezone: this.homey.clock.getTimezone(),
        token: token ?? undefined,
      });
      this.api = new PetlibroApi(this.session);
      this.log('API client restored from saved credentials');
    }

    this.registerFlowCards();
    this.log('Petlibro app initialized');
  }

  async setCredentials(email: string, password: string, region: string): Promise<string> {
    this.session = new PetlibroSession({
      baseUrl: API_BASE_URL,
      email,
      password,
      region,
      timezone: this.homey.clock.getTimezone(),
    });
    this.api = new PetlibroApi(this.session);

    const token = await this.api.login(email, password);

    this.homey.settings.set('email', email);
    this.homey.settings.set('password', password);
    this.homey.settings.set('region', region);
    this.homey.settings.set('token', token);

    this.log('Credentials saved, logged in successfully');
    return token;
  }

  getApi(): PetlibroApi {
    if (!this.api) {
      throw new Error('API not initialized. Please pair a device first.');
    }
    return this.api;
  }

  private registerFlowCards() {
    // Condition: is food level low?
    this.homey.flow.getConditionCard('is_food_low')
      .registerRunListener(async (args) => {
        return args.device.getCapabilityValue('food_level') === 'low';
      });

    // Condition: is device online?
    this.homey.flow.getConditionCard('is_online')
      .registerRunListener(async (args) => {
        return args.device.getAvailable();
      });

    // Action: trigger manual feeding
    this.homey.flow.getActionCard('manual_feed')
      .registerRunListener(async (args) => {
        await args.device.triggerManualFeed(args.portions);
      });
  }

}

module.exports = PetlibroApp;
