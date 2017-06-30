'use strict';

var fs = require( 'fs' );
var path = require( 'path' );

var webpackConfig = require( './webpack.config.js' );

var extend = require( 'extend' );
var glob = require( 'glob' );

// var jshintrc = JSON.parse( fs.readFileSync( './.jshintrc' ).toString() );


// Base paths used by the tasks.
// They always have to finish with a '/'.
//
var SOURCE_PATH = 'sources/';
var EXAMPLE_PATH = 'examples/';
var BUILD_PATH = 'builds/';
var TEST_PATH = 'tests/';
var DIST_PATH = path.join( BUILD_PATH, 'dist/' );

// Utility functions
var find = function ( cwd, pattern ) {

    if ( typeof pattern === 'undefined' ) {
        pattern = cwd;
        cwd = undefined;
    }

    var isEntity = function ( pathname ) {
        if ( cwd ) pathname = path.join( cwd, pathname );
        return !fs.lstatSync( pathname ).isDirectory();
    };

    var options = {};

    if ( cwd )
        options.cwd = cwd;

    return glob.sync( pattern, options ).filter( isEntity );

};

// get source file once and for all, caching results.
var srcFiles = find( SOURCE_PATH, '**/*.js' ).map( function ( pathname ) {
    return pathname;
} );

var exampleFiles = find( EXAMPLE_PATH, '**/*.js' ).map( function ( pathname ) {
    return pathname;
} );

var testsFiles = find( TEST_PATH, '**/*.js' ).map( function ( pathname ) {
    return pathname;
} );


// Used to store all Grunt tasks
//
var gruntTasks = {};

// ## Top-level configurations
//
( function () {

    var configFilename = './.eslintrc.json';

    // to finish https://github.com/sketchfab/showwebgl/blob/f5028b774ab47c976461807eab522b302edc1e2b/Gruntfile.js
    gruntTasks.eslint = {
        options: {
            configFile: configFilename
        }
    };

    //build/bundle
    gruntTasks.copy = {
        options: {}
    };

    gruntTasks.clean = {
        options: {}
    };

    //tests
    gruntTasks.qunit = {};

    gruntTasks.connect = {};

} )();


// ## Webpack
//
// Build OSGJS with webpack
//
( function () {

    var webpack = require( 'webpack' );
    // var ExtractTextPlugin = require( 'extract-text-webpack-plugin' );

    var targets = {
        build: {
            entry: {
                OSG: [ './sources/OSG.js' ],
                tests: [ './tests/tests.js' ],
                benchmarks: [ './benchmarks/benchmarks.js' ]
            },
            devtool: 'source-map',

            module: {
                loaders: [ {
                    test: /\.js$/,
                    loader: 'webpack-strip-block'
                } ]
            }

        },

        builddebug: {
            entry: {
                OSG: [ './sources/OSG.js' ],
                tests: [ './tests/tests.js' ],
                benchmarks: [ './benchmarks/benchmarks.js' ]
            },
            devtool: 'eval-source-map'

        },

        buildrelease: {
            devtool: null,
            output: {
                path: DIST_PATH,
                filename: '[name].min.js',
                libraryTarget: 'umd',
                library: 'OSG'
            },

            loaders: [ {
                test: /\.js$/,
                loader: 'webpack-strip-block'
            } ],
            // additional plugins for this specific mode
            plugins: [
                new webpack.optimize.UglifyJsPlugin( {
                    sourceMap: false
                } )
            ]
        }
    };


    gruntTasks.webpack = {
        options: webpackConfig,
        build: targets.build,
        buildrelease: targets.buildrelease,
        builddebug: targets.builddebug,
        watch: {
            entry: targets.build.entry,
            devtool: targets.build.devtool,

            // use webpacks watcher
            // You need to keep the grunt process alive
            watch: true,
            keepalive: true

        }
    };


} )();


// ## ESLint
//
// Will check the Gruntfile and every "*.js" file in the "statics/sources/" folder.
//
( function () {

    gruntTasks.eslint.self = {
        options: {
            node: true
        },
        src: [ 'Gruntfile.js' ]
    };

    gruntTasks.eslint.sources = {
        options: {
            browser: true
        },
        src: srcFiles.filter( function ( pathName ) {
            return pathName.indexOf( 'vendors' ) === -1 &&
                pathName.indexOf( 'glMatrix' ) === -1 &&
                pathName.indexOf( 'webgl-debug.js' ) === -1 &&
                pathName.indexOf( 'webgl-utils.js' ) === -1;

        } ).map( function ( pathname ) {
            return path.join( SOURCE_PATH, pathname );
        } )

    };

    gruntTasks.eslint.examples = {
        options: {
            browser: true
        },
        src: exampleFiles.filter( function ( pathName ) {
            return pathName.indexOf( 'vendors' ) === -1;

        } ).map( function ( pathname ) {
            return path.join( EXAMPLE_PATH, pathname );
        } )

    };

    gruntTasks.eslint.tests = {
        options: {
            browser: true
        },
        src: testsFiles.filter( function ( pathName ) {
            return pathName.indexOf( 'glMatrix' ) === -1 &&
                pathName.indexOf( 'mocha.js' ) === -1;
        } ).map( function ( pathname ) {
            return path.join( TEST_PATH, pathname );
        } )

    };

    gruntTasks.eslint.fix = {
        options: {
            fix: true,
            browser: true
        },
        src: []
    };

    [ 'tests', 'examples', 'sources', 'self' ].forEach( function ( target ) {
        gruntTasks.eslint.fix.src = gruntTasks.eslint.fix.src.concat( gruntTasks.eslint[ target ].src );
    } );

} )();


// ## Clean
//
( function () {

    gruntTasks.clean.staticWeb = {
        src: [ path.join( BUILD_PATH, 'web' ) ]
    };


} )();

( function () {
    gruntTasks.mocha = {
        test: {
            options: {
                urls: [ 'http://localhost:9001/tests/index.html' ],
                mocha: {
                    ui: 'qunit'
                },
                reporter: 'Spec',
                timeout: 10000,
                log: true
            }
        },
        bench: {
            options: {
                urls: [ 'http://localhost:9001/benchmarks/index.html' ],
                mocha: {
                    ui: 'qunit'
                },
                reporter: 'list'
            }
        }

    };

} )();


// ## Documentation
//
( function () {
    gruntTasks.documentation = {
        'default': {
            files: [ {
                expand: true,
                cwd: 'sources',
                src: [ '**/*.js' ]
            } ],
            options: {
                destination: 'docs'
            }
        }
    };

} ) ();

// ## Plato
( function () {
    gruntTasks.plato = {
        options: {
            // Task-specific options go here.
        },
        main: {
            files: {
                'docs/analysis': srcFiles.map( function ( pathname ) {
                    return path.join( SOURCE_PATH, pathname );
                } )
            }
        }
    };
} )();


// ## connect
//
( function () {

    // will start a server on port 9001 with root directory at the same level of
    // the grunt file
    var currentDirectory = path.dirname( path.resolve( './Gruntfile.js', './' ) );
    gruntTasks.connect = {
        server: {
            options: {
                port: 9001,
                hostname: 'localhost'
            }
        },
        dist: {
            options: {
                port: 9000,
                directory: currentDirectory,
                hostname: 'localhost',
                open: true,
                middleware: function ( connect, options, middlewares ) {

                    // inject a custom middleware into the array of default middlewares
                    middlewares.unshift( function ( req, res, next ) {

                        var ext = path.extname( req.url );
                        if ( ext === '.gz' ) {
                            res.setHeader( 'Content-Type', 'text/plain' );
                            res.setHeader( 'Content-Encoding', 'gzip' );
                        }

                        return next();
                    } );

                    return middlewares;
                }
            }
        }

    };

} )();
// ## Copy
// (explicit because windows doesn't support symlinks)
( function () {

    gruntTasks.copyto = {

        main: {
            files: [
                //Hammer:
                {
                    cwd: './',
                    src: 'examples/vendors/hammer-2.0.4.js',
                    dest: 'examples/vendors/hammer.js'
                },
                //Bluebird:
                {
                    cwd: './',
                    src: 'examples/vendors/bluebird-2.10.2.js',
                    dest: 'examples/vendors/bluebird.js'
                }
            ]
        }
    };

} )();

( function () {
    gruntTasks.release = {
        options: {
            npm: false
        }
    };
} )();

/* eslint-disable camelcase */
( function () {
    gruntTasks.update_submodules = {
        default: {
            options: {
                // default command line parameters will be used: --init --recursive
            }
        }
    };
} )();

/* eslint-enable camelcase */


( function () {
    gruntTasks.copy = {
        staticWeb: {
            files: [ {
                expand: true,
                src: [ 'sources/**' ],
                dest: path.join( BUILD_PATH, 'web/' )
            }, {
                expand: true,
                src: [ 'docs/**' ],
                dest: path.join( BUILD_PATH, 'web/' )
            }, {
                expand: true,
                src: [ 'examples/**' ],
                dest: path.join( BUILD_PATH, 'web/' )
            }, {
                expand: true,
                src: [ 'tests/**' ],
                dest: path.join( BUILD_PATH, 'web/' )
            }, {
                expand: true,
                src: [ 'tutorials/**' ],
                dest: path.join( BUILD_PATH, 'web/' )
            }, {
                expand: true,
                src: [ 'benchmarks/**' ],
                dest: path.join( BUILD_PATH, 'web/' )
            }, {
                expand: true,
                cwd: 'builds',
                src: [ 'dist/**' ],
                dest: path.join( BUILD_PATH, 'web/builds/' )
            }, {
                expand: true,
                cwd: 'builds',
                src: [ 'active/**' ],
                dest: path.join( BUILD_PATH, 'web/builds/' )
            } ]
        }
    };
} )();


module.exports = function ( grunt ) {

    var distFullPath = path.normalize( path.join( __dirname, DIST_PATH ) ); // eslint-disable-line no-undef
    grunt.file.mkdir( distFullPath );

    grunt.initConfig( extend( {
        pkg: grunt.file.readJSON( 'package.json' )
    }, gruntTasks ) );

    grunt.loadNpmTasks( 'grunt-documentation' );
    grunt.loadNpmTasks( 'grunt-mocha' );

    grunt.loadNpmTasks( 'grunt-plato' );

    grunt.loadNpmTasks( 'grunt-release' );
    grunt.loadNpmTasks( 'grunt-contrib-connect' );

    grunt.loadNpmTasks( 'grunt-update-submodules' );

    grunt.loadNpmTasks( 'grunt-eslint' );
    grunt.loadNpmTasks( 'grunt-contrib-copy' );
    grunt.loadNpmTasks( 'grunt-contrib-clean' );

    grunt.loadNpmTasks( 'grunt-copy-to' );
    grunt.loadNpmTasks( 'grunt-shell' );
    grunt.loadNpmTasks( 'grunt-webpack' );

    grunt.registerTask( 'watch', [ 'webpack:watch' ] );
    grunt.registerTask( 'check', [ 'eslint:self', 'eslint:sources', 'eslint:examples', 'eslint:tests' ] );

    grunt.registerTask( 'beautify', [ 'eslint:fix' ] );

    grunt.registerTask( 'sync', [ 'update_submodules:default' ] );

    grunt.registerTask( 'test', [ 'connect:server', 'mocha:test' ] );
    grunt.registerTask( 'benchmarks', [ 'connect:server', 'mocha:bench' ] );

    grunt.registerTask( 'docs', [ 'plato', 'documentation:default' ] );

    grunt.registerTask( 'build', [ 'copyto', 'webpack:build' ] );
    grunt.registerTask( 'build-release', [ 'copyto', 'webpack:buildrelease' ] );
    grunt.registerTask( 'build-debug', [ 'copyto', 'webpack:builddebug' ] );

    grunt.registerTask( 'default', [ 'check', 'build' ] );
    grunt.registerTask( 'serve', [ 'sync', 'build', 'connect:dist:keepalive' ] );


};
