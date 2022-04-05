const core = require('@actions/core');
const async = require ('async');
const { request } = require('@octokit/request');

const github_token = `${process.env.GITHUB_TOKEN}`;
const collection_organization = `${process.env.INPUT_COLLECTION_ORGANIZATION}`;
const collection_repository = `${process.env.INPUT_COLLECTION_REPOSITORY}`;
const collection_path = `${process.env.INPUT_COLLECTION_PATH}`;
const reference_url = `${process.env.INPUT_REFERENCE_URL}`;
const target_url = `${process.env.INPUT_TARGET_URL}`;
const target_username = `${process.env.INPUT_TARGET_USERNAME}`;
const target_password = `${process.env.INPUT_TARGET_PASSWORD}`;

async function github_octokit(gh_token, org, repo, path) {
    // Following GitHub docs formatting:
    // https://docs.github.com/en/rest/reference/repos#get-repository-content
    const result = await request('GET /repos/{org}/{repo}/contents/{path}', {
      headers: {
        'authorization': 'token' + ' ' + gh_token,
      },
      org: org,
      repo: repo,
      path: path,
      type: 'private'
    });
    return result.data.download_url;
}

async function newman() {
  try {
    // Run Newman as a library
    const newman = require('newman');
    const jsonlint = require('jsonlint');
    const jsonDiff = require('json-diff');

    const resultSet = [];

    // call newman.run to pass `options` object and wait for callback
    newman.run({
        collection: await github_octokit(github_token, collection_organization, collection_repository, collection_path),
        envVar: [
            { "key":"reference_url", "value":reference_url },
            { "key":"reference_token", "value":github_token },
            { "key":"target_url", "value":target_url },
            { "key":"target_username", "value":target_username },
            { "key":"target_password", "value":target_password }
        ],
        reporters: 'cli',
        bail: true
    }, function (err, summary) {
       // Custom error handling to ensure run failures will make the GitHub Actions job fail.
       if (err || summary.run.error || summary.run.failures.length) {
         process.exit(1);
       }
    })
    .on('request', (error, data) => {
          if (error) {
              console.log(error);
              return;
          }
          else {
          // Add each response to the resultSet array, after linting.
          resultSet.push(jsonlint.parse((data.response.stream.toString())));
          }
    })
    .on('done', (error) => {
          if (error) {
              console.log(error);
              return;
          }
          // After both requests, diff them.
          console.log('\n*** Printing the diff without test exclusions ***\n');
          const fullDiff = jsonDiff.diffString( resultSet[0], resultSet[1] );
          console.log(fullDiff);
          console.log('*** End of diff ***');
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

// Run newman
newman();
