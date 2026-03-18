// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-chrome-launcher'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      jasmine: {},
      clearContext: false,
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/form-builder-app'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }],
      exclude: [
        '**/*.spec.ts',
        '**/main.ts',
        '**/app.config.ts',
        '**/app.routes.ts',
      ],
      check: {
        global: {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
    },
    reporters: ['progress'],
    browsers: ['Chrome'],
    restartOnFileChange: true,
  });
};
