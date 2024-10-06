const { src, dest, watch: gulpWatch, series, parallel } = require('gulp');
const yargs = require('yargs');
const package = require('./package.json');
const del = require('del');
const changed = require('gulp-changed');
const rename = require('gulp-rename');
const gulpif = require('gulp-if');
const ignore = require('gulp-ignore');
const postCSS = require('gulp-postcss');
const gulpsass = require('gulp-sass')(require('sass'));
const autoprefixer = require('autoprefixer');
const htmlmin = require('gulp-htmlmin');
const imagemin = require('gulp-imagemin');
const jeditor = require('gulp-json-editor');
const yaml = require('gulp-yaml');
const esbuild = require('esbuild');
const through2 = require('through2');

const origin = './src';
const paths = {
	manifest: `${ origin }/manifest*.yml`,
	mvExcludeDenominator: '**/DELETEME.*',
	files: {
		script: `${ origin }/**/*.@(js|ts)`,
		styles: `${ origin }/css/*.@(css|scss)`,
		html: `${ origin }/html/*.html`,
		assets: `${ origin }/assets/**/*.@(png|jpg|jpeg|gif|svg)`,
		json: `${ origin }/**/*.json`
	},
	baseBuild: './build',
	baseDist: './dist',
	build: './build',
	dist: './dist',
	set target(target) {
		this.mvTarget = target;
		this.build = `${ this.baseBuild }/${ target }`;
		this.dist = `${ this.baseDist }/${ target }`;
	}
}
const state = {
	DEV: 'dev',
	PRODUCTION: 'production',
	get default() {
		return this.DEV;
	},
	get current() {
		return yargs.argv.state || this[this.DEFAULT];
	},
	get prod() {
		return this.current === this.PRODUCTION;
	},
	get dest() {
		return this.prod ? paths.dist : paths.build;
	}
}
paths.target = yargs.argv.target || 'mv3';

function mvSpecificFiles(filename) {
	const [basename, mv] = filename.split('_');

	if (mv && mv !== paths.mvTarget) return `${paths.mvExcludeDenominator}_${basename}`;

	return basename;
}

// Esbuild transform function
function esbuildTransform() {
	return through2.obj(function (file, _, callback) {
		esbuild.build({
			entryPoints: [file.path],
			bundle: true,
			write: false,
			minify: false,
			loader: {
				'.js': 'js',
				'.ts': 'ts'
			}
		}).then(result => {
			file.contents = Buffer.from(result.outputFiles[0].text);

			if (file.extname === '.ts') file.extname = '.js';

			callback(null, file);
		}).catch(err => {
			callback(err);
		});
	});
}

function scripts() {
	return src(paths.files.script)
		.pipe(changed(state.dest, {extension: '.js'}))
		.pipe(esbuildTransform())
		.pipe(rename(path => (path.basename = mvSpecificFiles(path.basename), path) ))
		.pipe(ignore(paths.mvExcludeDenominator))
		.pipe(dest(state.dest));
}

function styles() {
	const plugins = [ autoprefixer() ];

	return src(paths.files.styles)
		.pipe(changed(state.dest + '/css', {extension: '.css'}))
		.pipe(rename(path => (path.basename = mvSpecificFiles(path.basename), path) ))
		.pipe(ignore(paths.mvExcludeDenominator))
		.pipe(gulpsass({ outputStyle: state.prod ? 'compressed' : 'expanded' }))
		.pipe(postCSS(plugins))
		.pipe(dest(state.dest + '/css'));
}

function html() {
	return src(paths.files.html)
		.pipe(changed(state.dest + '/html'))
		.pipe(rename(path => (path.basename = mvSpecificFiles(path.basename), path) ))
		.pipe(ignore(paths.mvExcludeDenominator))
		.pipe(gulpif(state.prod, htmlmin({ collapseWhitespace: true })))
		.pipe(dest(state.dest + '/html'));
}

function images() {
	return src(paths.files.assets)
		.pipe(changed(state.dest + '/assets'))
		.pipe(rename(path => (path.basename = mvSpecificFiles(path.basename), path) ))
		.pipe(ignore(paths.mvExcludeDenominator))
		.pipe(gulpif(state.prod, imagemin()))
		.pipe(dest(state.dest + '/assets'));
}

function json() {
	return src(paths.files.json)
		.pipe(changed(state.dest))
		.pipe(rename(path => (path.basename = mvSpecificFiles(path.basename), path) ))
		.pipe(ignore(paths.mvExcludeDenominator))
		.pipe(jeditor(json => {return json}, { beautify: !state.prod }))
		.pipe(dest(state.dest));
}

function manifest() {
	return src(paths.manifest)
		.pipe(changed(state.dest, {extension: '.json'}))
		.pipe(rename(path => (path.basename = mvSpecificFiles(path.basename), path) ))
		.pipe(ignore(paths.mvExcludeDenominator))
		.pipe(yaml({ schema: 'DEFAULT_FULL_SCHEMA' }))
		.pipe(jeditor(json => {
			json.version = package.version;
			return json;
		}, { beautify: !state.prod } ))
		.pipe(dest(state.dest));
}

function clean() {
	// Before building, clean up the the target folder for all previous files.
	// This is only done when starting the build tasks.
	if (state.prod) return del([ paths.dist ], { force: true });
	else return del([ paths.build ], { force: true });
}

function destroy() {
	// Remove the build and distribution folders.
	return del([ paths.baseDist, paths.baseBuild ], { force: true });
}

function watch() {
	console.log('\x1b[35m%s\x1b[0m', `Now watching the ${ paths.mvTarget } build for changes...`);

	gulpWatch(paths.files.script, scripts);
	gulpWatch(paths.files.styles, styles);
	gulpWatch(paths.files.html, html);
	gulpWatch(paths.files.assets, images);
	gulpWatch(paths.files.json, json);
	gulpWatch(paths.manifest, manifest);
}

async function broadcast() {
	console.log('\x1b[35m%s\x1b[0m', `Compiling ${ state.current } version for ${ paths.mvTarget }...`);
	return;
}

exports.destroy = destroy;
exports.build = series(broadcast, clean, parallel(scripts, styles, html, images, json, manifest));
exports.watch = series(exports.build, watch);
exports.default = exports.build
