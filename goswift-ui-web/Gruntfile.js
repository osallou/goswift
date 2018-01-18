'use strict';

module.exports = function (grunt) {

    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);
    // Time how long tasks take. Can help when optimizing build times
    require('time-grunt')(grunt);

    grunt.initConfig({
        babel: {
          options: {
            plugins: ['transform-es2015-destructuring', 'transform-object-rest-spread', 'transform-react-jsx'],
            presets: ['es2015', 'react']
          },
          jsx: {
            files: [{
              expand: true,
              cwd: 'src/', // Custom folder
              src: ['*.js'],
              dest: 'dist/', // Custom folder
              ext: '.js'
            }]
          }
        }
    });

    grunt.registerTask('default', ['babel']);
};
