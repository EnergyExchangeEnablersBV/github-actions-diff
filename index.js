const core = require('@actions/core');
const async = require ('async');
const { request } = require("@octokit/request");

const github_token = `${process.env.GITHUB_TOKEN}`;
const collection_organization = `${process.env.INPUT_COLLECTION_ORGANIZATION}`;
const collection_repository = `${process.env.INPUT_COLLECTION_REPOSITORY}`;
const collection_path = `${process.env.INPUT_COLLECTION_PATH}`;
const test1_url = `${process.env.INPUT_TEST1_URL}`;
const test2_url = `${process.env.INPUT_TEST2_URL}`;
const test2_username = `${process.env.INPUT_TEST2_USERNAME}`;
const test2_password = `${process.env.INPUT_TEST2_PASSWORD}`;

async function github_octokit(a, b, c, d) {
// Following GitHub docs formatting:
// https://docs.github.com/en/rest/reference/repos#get-repository-content
    const result = await request("GET /repos/{org}/{repo}/contents/{path}", {
      headers: {
        "authorization": "token" + " " + a,
      },
      org: b,
      repo: c,
      path: d,
      type: "private"
    });
    // console.log(result.data.download_url);
    return result.data.download_url;
//    const download_raw_url_tokenized = `${result.data.download_url}`;
//    console.log(download_raw_url_tokenized);
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
            { "key":"test1_url", "value":test1_url },
            { "key":"test1_bearer_token", "value": github_token },
            { "key":"test2_url", "value":test2_url },
            { "key":"test2_username", "value":test2_username },
            { "key":"test2_password", "value":test2_password }
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
