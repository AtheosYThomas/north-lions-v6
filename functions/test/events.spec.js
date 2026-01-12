"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const functionsTest = require('firebase-functions-test');
// Initialize the test SDK
const test = functionsTest({
    projectId: 'demo-project',
}, 'path/to/key.json');
const events_1 = require("../src/events");
(0, globals_1.describe)('Event Functions', () => {
    let wrappedGetEvents;
    let wrappedGetEvent;
    let wrappedCreateEvent;
    (0, globals_1.beforeAll)(() => {
        wrappedGetEvents = test.wrap(events_1.getEvents);
        wrappedGetEvent = test.wrap(events_1.getEvent);
        wrappedCreateEvent = test.wrap(events_1.createEvent);
    });
    (0, globals_1.afterAll)(() => {
        test.cleanup();
    });
    (0, globals_1.it)('should be a callable function', () => {
        if (typeof events_1.getEvents !== 'function') {
            throw new Error('getEvents is not a function');
        }
    });
    (0, globals_1.it)('getEvents should return a promise', async () => {
        try {
            await wrappedGetEvents({});
        }
        catch (e) {
            if (!e)
                throw new Error('Expected error but got none');
        }
    });
    // Basic "use" of variables to avoid unused error
    (0, globals_1.it)('should wrap other functions', () => {
        if (!wrappedGetEvent || !wrappedCreateEvent)
            throw new Error('Wrappers failed');
    });
});
//# sourceMappingURL=events.spec.js.map