// Jest setup file
// Provides chrome API mock for testing
global.chrome = {
    runtime: {
        getManifest: () => ({ version: "0.0.0-test" }),
        lastError: null,
        sendMessage: () => {},
        onMessage: { addListener: () => {} }
    },
    storage: {
        local: {
            get: (keys, cb) => cb({}),
            set: (items, cb) => cb && cb()
        }
    }
};
