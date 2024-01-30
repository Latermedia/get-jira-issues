const axios = require('axios');

const githubApiUrl = 'https://api.github.com/repos/';
const githubPulls = '/pulls/';
const githubCommits = '/commits';

const pullRequestNumber = process.env.PR_NUMBER;
const repository = process.env.REPO;
const githubToken = process.env.GH_API_TOKEN;

const githubFullUrl = `${githubApiUrl}${repository}${githubPulls}${pullRequestNumber}${githubCommits}`;

const prHeaders = {
  'Accept': 'application/vnd.github.v3+json',
  'Authorization': `Bearer ${githubToken}`,
};

async function getCommitMessages(pullRequestNumber) {
  try {
    const response = await axios.get(githubFullUrl, { headers: prHeaders });
    return response.data.map(commit => commit.commit.message);
  } catch (error) {
    console.error(`Error fetching commit messages: ${error.message}`);
    process.exit(1);
  }
}

function extractJiraTickets(commitMessages) {
  const jiraTicketSet = new Set();

  const pattern = /([A-Z]{2,}-[0-9]+)/gm;

  commitMessages.forEach(message => {
    const matches = message.match(pattern);
    if (matches) {
      matches.forEach(match => jiraTicketSet.add(match));
    }
  });

  return Array.from(jiraTicketSet);
}

if (require.main === module) {


  if (!pullRequestNumber) {
    console.error('PR_NUMBER environment variable not provided.');
    process.exit(1);
  }

  getCommitMessages(pullRequestNumber)
    .then(commitMessages => {
      const jiraTickets = extractJiraTickets(commitMessages);
      console.log(JSON.stringify(jiraTickets));
    })
    .catch(error => {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    });
}