# lighthouse-a11y-audit
Run Lighthouse accessibility reports against multiple websites and see an overview of the results.

Disclaimer: this is hacked together to serve a purpose. It doesn't handle errors well and it's not that customisable. It just runs a11y lighthouse tests against URLs you give it.

## Installation
Requires Node v16.13.1

Clone this repo and run.

	npm install

## Settings
Make changes to the included the `settings.json` file to run the audits against your chosen URLs.

    {
        "reportsLocation": "./reports",
        "sites": [
            {
                "title": "Example Site",
                "folder": "example.com",
                "urls": [
                    {
                        "title": "Example Homepage",
                        "url": "https://www.example.com"
                    }
                ]
            }
        ]
    }

| Option      | Description |
| ----------- | ----------- |
| reportsLocation      | Sets the output location of reports and summaries.       |

### Sites
| Option      | Description |
| ----------- | ----------- |
| title      | Title of the website or project. Used in report titles.       |
| folder      | Name of the folder for reports to be stored in. Must be unique.       |
| urls      | Array of URLs within your website or project.       |

### URLs
| Option      | Description |
| ----------- | ----------- |
| title      | Title of the page. Used in the reports.       |
| url      | URL of the page being tested.       |

## Run
The script will test each URL sequentially and generate a report for each site/project with a breakdown of a11y issues on each page.

	npm start
