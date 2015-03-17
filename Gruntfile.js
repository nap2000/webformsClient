/*jshint node:true*/
"use strict";

module.exports = function( grunt ) {
    grunt.initConfig( {
        pkg: grunt.file.readJSON( "package.json" ),
        connect: {
            server: {
                options: {
                    port: 8080
                }
            },
            test: {
                options: {
                    port: 8000
                }
            }
        },
        jsbeautifier: {
            test: {
                src: [ "*.js", "webforms/src/js/**/*.js" ],
                options: {
                    config: "./.jsbeautifyrc",
                    mode: "VERIFY_ONLY"
                }
            },
            fix: {
                src: [ "*.js", "webforms/src/js/**/*.js" ],
                options: {
                    config: "./.jsbeautifyrc"
                }
            }
        },
        jshint: {
            options: {
                jshintrc: ".jshintrc"
            },
            all: [ "*.js", "webforms/src/js/**/*.js", "!webforms/src/js/extern.js" ]
        },
        prepWidgetSass: {
            writePath: "src/sass/component/_widgets.scss",
            widgetConfigPath: "webforms/src/js/config.json"
        },
        watch: {
            sass: {
                files: [ 'webforms/src/js/config.json', 'src/sass/**/*.scss', 'webforms/src/lib/enketo-core/src/**/*.scss' ],
                tasks: [ 'style' ],
                options: {
                    spawn: false
                }
            },
            js: {
                files: [ '*.js', 'webforms/src/js/*/**.js', 'webforms/src/lib/enketo-core/**/*.js' ],
                tasks: [ 'compile' ],
                options: {
                    spawn: false
                }
            }
        },
        sass: {
            dist: {
                options: {
                    //sourcemap: true,
                    style: "expanded",
                    noCache: true
                },
                files: [ {
                    expand: true,
                    cwd: "src/sass",
                    src: [ "**/*.scss", "!**/_*.scss" ],
                    dest: "public/build/css",
                    flatten: true,
                    ext: ".css"
                } ]
            }
        },
        // this compiles all javascript to a single minified file
        requirejs: {
            options: {
                //generateSourceMaps: true,
                preserveLicenseComments: false,
                baseUrl: "webforms/src/js/module",
                mainConfigFile: "webforms/src/js/require-build-config.js",
                findNestedDependencies: true,
                include: [ 'core-lib/require' ],
                //optimize: "uglify2",
                optimize: "none",
                done: function( done, output ) {
                    var duplicates = require( 'rjs-build-analysis' ).duplicates( output );

                    if ( duplicates.length > 0 ) {
                        grunt.log.subhead( 'Duplicates found in requirejs build:' );
                        grunt.log.warn( duplicates );
                        done( new Error( 'r.js built duplicate modules, please check the excludes option.' ) );
                    } else {
                        grunt.log.writeln( 'Checked for duplicates. All seems OK!' );
                    }
                    done();
                }
            },
            "webform": getWebformCompileOptions()
            //            "front": {
            //                options: {
            //                    name: "../main-front",
            //                    out: "public/build/js/front-combined.min.js"
            //                }
            //            }
        },
        symlink: {
            expanded: {
                files: [ {
                    expand: true,
                    overwrite: false,
                    cwd: 'src/sass/grid/js',
                    src: [ '*.js' ],
                    dest: 'webforms/src/js/module'
                } ]
            }
        }
    } );


    function getWebformCompileOptions( type ) {
        //add widgets js and widget config.json files
        var widgets = grunt.file.readJSON( 'webforms/src/js/config.json' ).widgets;
        widgets.forEach( function( widget, index, arr ) {
            arr.push( 'text!' + widget.substr( 0, widget.lastIndexOf( '/' ) + 1 ) + 'config.json' );
        } );
        type = ( type ) ? '-' + type : '';
        return {
            options: {
                name: "../main-webform" + type,
                out: "public/build/js/webform" + type + "-combined.min.js",
                include: [ 'core-lib/require' ].concat( widgets )
            }
        };
    }

    grunt.loadNpmTasks( "grunt-jsbeautifier" );
    grunt.loadNpmTasks( 'grunt-contrib-connect' );
    grunt.loadNpmTasks( "grunt-contrib-watch" );
    grunt.loadNpmTasks( "grunt-contrib-jshint" );
    grunt.loadNpmTasks( "grunt-contrib-sass" );
    grunt.loadNpmTasks( "grunt-contrib-requirejs" );
    grunt.loadNpmTasks( "grunt-contrib-symlink" );

    //maybe this can be turned into a npm module?
    grunt.registerTask( "prepWidgetSass", "Preparing _widgets.scss dynamically", function() {
        var widgetConfig, widgetFolderPath, widgetSassPath, widgetConfigPath,
            config = grunt.config( "prepWidgetSass" ),
            widgets = grunt.file.readJSON( config.widgetConfigPath ).widgets,
            content = "// Dynamically created list of widget stylesheets to import based on the content\r\n" +
            "// based on the content of config.json\r\n\r\n";

        widgets.forEach( function( widget ) {
            if ( widget.indexOf( "enketo-widget/" ) === 0 ) {
                //strip require.js module name
                widgetFolderPath = widget.substr( 0, widget.lastIndexOf( "/" ) + 1 );
                //replace widget require.js path shortcut with proper path relative to src/js
                widgetSassPath = widgetFolderPath.replace( /^enketo-widget\//, "webforms/src/lib/enketo-core/src/widget/" );
                //create path to widget config file
                widgetConfigPath = widgetFolderPath.replace( /^enketo-widget\//, "webforms/src/lib/enketo-core/src/widget/" ) + "config.json";
                grunt.log.writeln( "widget config path: " + widgetConfigPath );
                //create path to widget stylesheet file
                widgetSassPath += grunt.file.readJSON( widgetConfigPath ).stylesheet;
            } else {
                grunt.log.error( [ "Expected widget path " + widget + " in config.json to be preceded by \"widget/\"." ] );
            }
            //replace this by a function that parses config.json in each widget folder to get the "stylesheet" variable
            content += "@import \"" + widgetSassPath + "\";\r\n";
        } );

        grunt.file.write( config.writePath, content );

    } );
    grunt.registerTask( "test", [ "jsbeautifier:test", "jshint" ] );
    grunt.registerTask( "style", [ "prepWidgetSass", "sass:dist" ] );
    grunt.registerTask( "compile", [ "symlink", "requirejs" ] );
    grunt.registerTask( 'server', [ 'connect:server:keepalive' ] );
    grunt.registerTask( "default", [ "jsbeautifier:fix", "symlink", "test", "style", "compile" ] );
};
