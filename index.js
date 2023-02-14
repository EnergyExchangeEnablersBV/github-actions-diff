const core = require('@actions/core');
const { request } = require('@octokit/request');
const newman = require('newman');

const github_token = `${process.env.GITHUB_TOKEN}`;
const collection_organization = `${process.env.INPUT_COLLECTION_ORGANIZATION}`;
const collection_repository = `${process.env.INPUT_COLLECTION_REPOSITORY}`;
const collection_path = `${process.env.INPUT_COLLECTION_PATH}`;
const collection_git_ref = `${process.env.INPUT_COLLECTION_GIT_REF}`;
const target_url = `${process.env.INPUT_TARGET_URL}`;
const target_username = `${process.env.INPUT_TARGET_USERNAME}`;
const target_password = `${process.env.INPUT_TARGET_PASSWORD}`;
const base_url = `${process.env.INPUT_BASE_URL}`;
const base_username = `${process.env.INPUT_BASE_USERNAME}`;
const base_password = `${process.env.INPUT_BASE_PASSWORD}`;

async function github_octokit(gh_token, org, repo, path, ref) {
    // Following GitHub docs formatting:
    // https://docs.github.com/en/rest/reference/repos#get-repository-content
    // Call without git ref, uses default branch
    if (!ref){
      const result = await request('GET /repos/{org}/{repo}/contents/{path}', {
        headers: {
          'authorization': 'token' + ' ' + gh_token,
        },
        org: org,
        repo: repo,
        path: path,
        type: 'private'
      });
      console.log('Collection URL: %s', result.data.html_url)
      return result.data.download_url;
    } 
    // Call with git ref
    else {
      const result = await request('GET /repos/{org}/{repo}/contents/{path}', {
        headers: {
          'authorization': 'token' + ' ' + gh_token,
        },
        org: org,
        repo: repo,
        path: path,
        type: 'private',
        ref: ref
      });
      console.log('Collection URL: %s', result.data.html_url)
      return result.data.download_url;
    }
}

async function mynewman() {
  try {
    // Run Newman as a library
    // call newman.run to pass `options` object and wait for callback
    newman.run({
        collection: await github_octokit(github_token, collection_organization, collection_repository, collection_path, collection_git_ref),
        envVar: [
            { "key":"reference_token", "value":github_token },
            { "key":"target_url", "value":target_url },
            { "key":"target_username", "value":target_username },
            { "key":"target_password", "value":target_password },
            { "key":"base_url", "value":base_url },
            { "key":"base_username", "value":base_username },
            { "key":"base_password", "value":base_password }
        ],
        reporters: ['cli', 'htmlextra'],
        reporter: {
          htmlextra: {
            skipHeaders: "Authorization"
          }
        },
        bail: true
    }, function (err, summary) {
       // Custom error handling to ensure run failures will make the GitHub Actions job fail.
       if (err || summary.run.error || summary.run.failures.length) {
         process.exit(1);
       }
      })
      .on('request', (error) => {
            if (error) {
                console.log(error);
            }
            else {
            console.log('\n*** Starting Newman request ***\n');
            }
      })
      .on('done', (error) => {
            if (error) {
                console.log(error);
                return;
            }
            console.log('\n*** Newman ran successfully, see report ***\n');
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

// Run newman
mynewman();
