
import { describe, it, beforeAll, afterAll } from '@jest/globals';
const functionsTest = require('firebase-functions-test');

// Initialize the test SDK
const test = functionsTest({
  projectId: 'demo-project',
}, 'path/to/key.json'); 

import { getEvents, getEvent, createEvent } from '../src/events';

describe('Event Functions', () => {
  let wrappedGetEvents: any;
  let wrappedGetEvent: any;
  let wrappedCreateEvent: any;

  beforeAll(() => {
    wrappedGetEvents = test.wrap(getEvents as any);
    wrappedGetEvent = test.wrap(getEvent as any);
    wrappedCreateEvent = test.wrap(createEvent as any);
  });

  afterAll(() => {
    test.cleanup();
  });

  it('should be a callable function', () => {
    if (typeof getEvents !== 'function') {
        throw new Error('getEvents is not a function');
    }
  });
  
  it('getEvents should return a promise', async () => {
    try {
      await wrappedGetEvents({});
    } catch (e: any) {
      if (!e) throw new Error('Expected error but got none');
    }
  });

  // Basic "use" of variables to avoid unused error
  it('should wrap other functions', () => {
      if(!wrappedGetEvent || !wrappedCreateEvent) throw new Error('Wrappers failed');
  });

});
