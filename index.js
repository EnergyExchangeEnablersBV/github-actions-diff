const core = require('@actions/core');

// most @actions toolkit packages have async methods
async function run() {
  try {
    // Run Newman as a library
    const newman = require('newman');
    const jsonlint = require('jsonlint');
    const jsonDiff = require('json-diff');

    const resultSet = [];
    const theCollection = './' + `${process.env.INPUT_COLLECTION}`;

    // call newman.run to pass `options` object and wait for callback
    newman.run({
        collection: require(theCollection),
        workingDir: './.github/postman',
        envVar: [
            { "key":"test1_url", "value":`${process.env.INPUT_TEST1_URL}` },
            { "key":"test1_bearer_token", "value":`${process.env.GITHUB_TOKEN}` },
            { "key":"test2_url", "value":`${process.env.INPUT_TEST2_URL}` },
            { "key":"test2_username", "value":`${process.env.INPUT_TEST2_USERNAME}` },
            { "key":"test2_password", "value":`${process.env.INPUT_TEST2_PASSWORD}` }
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

run();
