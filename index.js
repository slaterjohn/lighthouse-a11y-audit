const fs = require('fs');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const logger = require('node-color-log');
const Handlebars = require("handlebars");
const moment = require("moment");
const settings = require("./settings.json");
const open = require('open');
const shortid = require('shortid');

var results = [];

async function runTest(opt, site){
	const nowTime = moment().format("YYYY-MM-DD-HH:mm:ss");
	const location = opt.location + '/' + nowTime + '--' + shortid.generate();
	const locationJson = location + '.json';
	const locationHTML = location + '.html';

	const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
	const options = {
		// logLevel: 'info',
		logLevel: false,
		output: ['json', 'html'],
		onlyCategories: ['accessibility'],
		port: chrome.port
	};

	logger.info('Starting: ' + opt.url);

	const runnerResult = await lighthouse(opt.url, options);

	// HTML
	const reportHTML = runnerResult.report[1];
	fs.writeFileSync(locationHTML, reportHTML);

	// JSON
	const reportJsonText = runnerResult.report[0];
	const reportJson = JSON.parse(reportJsonText);
	fs.writeFileSync(locationJson, reportJsonText);

	// Setup results
	var result = {
		"title": opt.title,
		"url": opt.url,
		"jsonReportURL": locationJson,
		"htmlReportURL": locationHTML,
		"score": 0,
		"scorePercent": 0,
		"bsScoreClass": '',
		"failures": [],
		"successes": [],
		"other": [],
	};

	// Scores = 0 are fails, null = na, 1 = pass
	// Find all the fails in audits
	for(var i in reportJson.audits){
		var key = i;
		var value = reportJson.audits[i];

		if(value.score == 0) result['failures'].push(value);
		else if(value.score == 1) result['successes'].push(value);
		else if(value.score == null) result['other'].push(value);
	}

	// Set the overall score
	result.score = runnerResult.lhr.categories.accessibility.score;
	result.scorePercent = runnerResult.lhr.categories.accessibility.score * 100;

	// Set score classes
	result.bsScoreClass = classForScore(result.score);

	logger.debug('Score: ' + result.score);
	logger.info('Finished: ' + opt.url);
	await chrome.kill();

	return result;

};


async function runSite(site){
	var dir = settings.reportsLocation;

	// Setup results object
	var thisSiteResult = {...site, ...{"results": []}};

	thisSiteResult['dateTime'] = moment().format("");
	thisSiteResult['dateTimeFriendly'] = moment().format("Do MMM YYYY [at] HH:mm");
	thisSiteResult['dateFriendly'] = moment().format("Do MMM YYYY");
	thisSiteResult['timeFriendly'] = moment().format("HH:mm");

	// Create reports folder
	if (!fs.existsSync(dir)) fs.mkdirSync(dir);

	// Create site report folder
	var siteDir = dir + '/' + site.folder;
	if (!fs.existsSync(siteDir)) fs.mkdirSync(siteDir);

	// Run test on each url
	for (const url of site.urls){
		url.location = siteDir;
		var result = await runTest(url, site);
		thisSiteResult.results.push(result);
	};

	results.push(thisSiteResult);
	makeSummaryPage(site, thisSiteResult);

}

async function runAllSites(){
	// Loop over each site
	for (const site of settings.sites){
		await runSite(site);
	}

	makeReportsPage();
}

function makeSummaryPage(site, thisSiteResult){
	// Get template summary file
	var source;
	try {
		source = fs.readFileSync('./templates/summary.html', 'utf8');
	} catch (err) {
		logger.error(err);
	}

	// Handlebars the file
	var template = Handlebars.compile(source);
	var summaryResult = template(thisSiteResult);

	// Save summary
	const nowTimeDate = moment().format("");
	const summaryLoc = settings.reportsLocation + '/' + site.folder + '.html';
	fs.writeFileSync(summaryLoc, summaryResult);
}

function makeReportsPage(sites){

	// Manipulate data object
	gatherResultsData();

	// Get template file
	var source;
	try {
		source = fs.readFileSync('./templates/reports.html', 'utf8');
	} catch (err) {
		logger.error(err);
	}

	// Handlebars the file
	var template = Handlebars.compile(source);
	var summaryResult = template({results: results});

	// Save summary
	const nowTimeDate = moment().format("");
	const summaryLoc = settings.reportsLocation + '/' + 'index.html';
	fs.writeFileSync(summaryLoc, summaryResult);

	// Launch report in browser
	open(settings.reportsLocation + '/' + 'index.html', {app: {name: 'google chrome'}});

}

function gatherResultsData(){

	// Loop each site
	results.forEach((site, i) => {
		var siteTotalScore = 0;
		var siteTotalFails = 0;
		var siteTotalSuccesses = 0;

		// Loop each site result
		site.results.forEach((result, i) => {
			siteTotalScore += result.score;
			siteTotalFails += result.failures.length;
			siteTotalSuccesses += result.successes.length;
		});

		// Average Score
		site.averageScore = siteTotalScore / site.results.length;
		site.averageScorePercent = Math.round(site.averageScore * 100);
		site.bsScoreClass = classForScore(site.averageScore);

		// Totals
		site.totalFails = siteTotalFails;
		site.totalSuccesses = siteTotalSuccesses;
		site.totalChecks = site.totalFails + site.totalSuccesses;

	});

}

function classForScore(score){
	if(score >= .9) return 'success';
	else if(score >= .5) return 'warning dark-text';
	else if(score < .5) return 'danger';
	else return 'light dark-text';
}

runAllSites();
