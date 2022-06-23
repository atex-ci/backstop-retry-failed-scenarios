/* eslint-disable node/no-unpublished-require */
/* eslint-disable @typescript-eslint/no-var-requires */
const {copy, resolve} = require('test-fixture')();

import fs from 'fs';
import {Runner} from '../lib/Runner';

describe('Runner', () => {
  test('it receives options', async () => {
    await copy();
    const runner = new Runner({
      retry: 3,
      config: 'backstop.json',
      command: 'backstop test',
      referenceCommand: 'backstop reference',
      outputProfile: 'profile.json',
      rootDir: resolve('backstop/failed'),
    });
    expect(runner).toBeDefined();
    expect(runner.retryCount).toEqual(3);
    expect(runner.configPath).toEqual('backstop.json');
    expect(runner.command).toEqual('backstop test');
    expect(runner.referenceCommand).toEqual('backstop reference');
    expect(runner.outputProfile).toEqual('profile.json');
  });

  test('minimum retry count is 2', async () => {
    await copy();
    const runner = new Runner({
      retry: 1,
    });
    expect(runner).toBeDefined();
    expect(runner.retryCount).toEqual(2);
  });

  test('it parses config', async () => {
    await copy();
    const runner = new Runner({
      config: 'backstop.json',
      rootDir: resolve('backstop/failed'),
    });
    expect(runner.config).toBeDefined();
    expect(runner.config.htmlReport).toBeDefined();
  });

  describe('run', () => {
    // test('it runs once when pass on first time', async () => {
    //   await copy();
    //   const runner = new Runner({
    //     retry: 3,
    //     config: 'backstop.json',
    //     command: 'cal -y',
    //     referenceCommand: 'cal',
    //     rootDir: resolve('backstop/failed'),
    //   });
    //   expect(await runner.run()).toEqual(true);
    //   expect(runner.retriedCount).toEqual(1);
    // });

    test('it retries specified times', async () => {
      await copy();
      const runner = new Runner({
        retry: 3,
        config: 'backstop.json',
        referenceCommand: 'not_existing_command',
        command: 'not_existing_command',
        rootDir: resolve('backstop/failed'),
      });
      expect(await runner.run()).toEqual(false);
      expect(runner.retriedCount).toEqual(3);
    });

    test('it generates output profile', async () => {
      await copy();
      const outputProfile = resolve('profile.json');
      const runner = new Runner({
        retry: 2,
        config: 'backstop.json',
        referenceCommand: 'not_existing_command',
        command: 'not_existing_command',
        outputProfile,
        rootDir: resolve('backstop/failed'),
      });
      await runner.run();
      expect(JSON.parse(fs.readFileSync(outputProfile).toString())).toEqual([
        {
          label: 'run',
          duration: expect.any(Number),
          startTime: expect.any(Number),
          endTime: expect.any(Number),
        },
        {
          label: '1.reference',
          duration: expect.any(Number),
          startTime: expect.any(Number),
          endTime: expect.any(Number),
        },
        {
          label: '1.test',
          duration: expect.any(Number),
          startTime: expect.any(Number),
          endTime: expect.any(Number),
        },
        {
          label: '2.reference',
          duration: expect.any(Number),
          startTime: expect.any(Number),
          endTime: expect.any(Number),
        },
        {
          label: '2.test',
          duration: expect.any(Number),
          startTime: expect.any(Number),
          endTime: expect.any(Number),
        },
      ]);
    });
  });

  describe('createFilter', () => {
    test('it creates filter from report', async () => {
      await copy();
      const runner = new Runner({
        config: 'backstop.json',
        rootDir: resolve('backstop/failed'),
      });
      expect(runner.filter).toEqual('^(BackstopJS Homepage)$');
    });
  });

  describe('isARunNeeded', () => {
    describe('when retriedCount < this.retryCount', () => {
      it('runs', () => {
        expect(Runner.isARunNeeded(1, 2, true, [])).toEqual(true);
      });
      it('runs if retryUntil is false', () => {
        expect(Runner.isARunNeeded(1, 2, false, [])).toEqual(true);
      });
    });

    describe('when retriedCount >= this.retryCount', () => {
      it('does not runs if retryUntil is false', () => {
        expect(Runner.isARunNeeded(2, 2, false, [])).toEqual(false);
        expect(Runner.isARunNeeded(3, 2, false, [])).toEqual(false);
      });

      it('does not runs if has no previous run', () => {
        expect(Runner.isARunNeeded(2, 2, true, [])).toEqual(false);
      });

      it('does not runs if has just one previous run', () => {
        expect(Runner.isARunNeeded(2, 2, true, [1])).toEqual(false);
      });

      it('does not runs if success are not increasing', () => {
        expect(Runner.isARunNeeded(2, 2, true, [2, 2])).toEqual(false);
      });

      it('run if success are increasing', () => {
        expect(Runner.isARunNeeded(2, 2, true, [1, 2])).toEqual(true);
      });

      it('run if success are increasing and runs are more than 2', () => {
        expect(Runner.isARunNeeded(4, 2, true, [1, 2, 4, 5])).toEqual(true);
      });
    });
  });

  describe('successes', () => {
    it('returns -1 if no run has been performed', async () => {
      const runner = new Runner({
        config: 'backstop.json',
      });

      expect(runner.successes).toEqual([]);
    });

    it('fills at least 2 element at each run', async () => {
      await copy();

      const runner = new Runner({
        config: 'backstop.json',
        referenceCommand: 'not_existing_command',
        command: 'not_existing_command',
        rootDir: resolve('backstop/failed'),
      });

      await runner.run();

      expect(runner.successes).toEqual([0, 0]);
    });

    it('add a value for each run', async () => {
      await copy();

      const runner = new Runner({
        retry: 10,
        config: 'backstop.json',
        referenceCommand: 'not_existing_command',
        command: 'not_existing_command',
        rootDir: resolve('backstop/failed'),
      });

      await runner.run();

      expect(runner.successes.length).toEqual(10);
    });
  });
});
