const axios = require("axios");
const jiraApi = require("jira-client");

const githubApiUrl = "https://api.github.com/repos/";
const githubPulls = "/pulls/";
const githubCommits = "/commits";
const projectKeyListDup = [];

const pullRequestNumber = process.env.PR_NUMBER;
const repository = process.env.REPO;
const githubToken = process.env.GH_API_TOKEN;
const jiraBaseUrl = process.env.JIRA_SERVER;
const jiraUser = process.env.JIRA_SERVICE_USER;
const jiraToken = process.env.JIRA_SERVICE_API_TOKEN;
const versionNumber = process.env.VERSION_NUMBER;
const sprintName = process.env.SPRINT_NAME;

const githubFullUrl = `${githubApiUrl}${repository}${githubPulls}${pullRequestNumber}${githubCommits}`;
const githubPullFull = `${githubApiUrl}${repository}${githubPulls}${pullRequestNumber}`;
const fullDescription = "Production Release for Sprint: " + sprintName;
const versionStrip = versionNumber.match(/v(\d+\.\d+\.\d+)/);
const finalVersionNumber = versionStrip[1];
const releaseTitle = "im-" + finalVersionNumber;
const jiraUrlStrip = jiraBaseUrl.match(/https:\/\/(\S*)/);
const jiraUrl = jiraUrlStrip[1];
const pattern = /[a-zA-Z]{2,}-[0-9]+/gm;

const prHeaders = {
  Accept: "application/vnd.github.v3+json",
  Authorization: `Bearer ${githubToken}`,
};

const jira = new jiraApi({
  protocol: "https",
  host: `${jiraUrl}`,
  username: `${jiraUser}`,
  password: `${jiraToken}`,
  apiVersion: "3",
  strictSSL: true,
});

if (!repository) {
  console.error("REPO environment variable not provided.");
  process.exit(1);
}

if (!pullRequestNumber) {
  console.error("PR_NUMBER environment variable not provided.");
  process.exit(1);
}


const titleQuery = async () => {
  try {
    let titleResponse = await axios.get(githubPullFull, { headers: prHeaders });

    if (!titleResponse || !titleResponse.data || !titleResponse.data.title) {
      throw new Error('Failed to fetch pull request title from GitHub API.');
    }

    let jiraTicketSet = new Set();
    const prTitleCheck = titleResponse.data.title.match(pattern);

    if (prTitleCheck) {
      prTitleCheck.forEach(match => jiraTicketSet.add(match));
      console.log("Added tickets from title to array:", ...jiraTicketSet);
    }

    return jiraTicketSet;

  } catch (error) {
    console.error('Error in titleQuery:', error.message);
    throw error;
  }
};


const commitQuery = async () => {
  try {
    let jiraTicketSet = new Set();
    let commitResponse = await axios.get(githubFullUrl, { headers: prHeaders });

    if (!commitResponse || !commitResponse.data || !Array.isArray(commitResponse.data)) {
      throw new Error('Failed to fetch commit data from GitHub API.');
    }

    commitResponse.data.forEach(commit => {
      if (!commit || !commit.commit || !commit.commit.message) {
        console.warn('Commit message not found or invalid:', commit);
        return;
      }

      let matches = commit.commit.message.match(pattern);
      if (matches) {
        matches.forEach(match => jiraTicketSet.add(match));
      }
    });

    if (jiraTicketSet.size > 0) {
      console.log("Added tickets from commits to array:", ...jiraTicketSet);
    } else {
      console.log("No Jira tickets found in commit messages.");
    }

    return jiraTicketSet;

  } catch (error) {
    console.error('Error in commitQuery:', error.message);
    throw error;
  }
};


async function filterTickets(titleTickets, commitTickets) {
  try {
    let jiraTicketSet = new Set();

    if (typeof titleTickets !== "undefined") {
      titleTickets.forEach(ticket => jiraTicketSet.add(ticket));
    }

    if (typeof commitTickets !== "undefined") {
      commitTickets.forEach(ticket => jiraTicketSet.add(ticket));
    }

    const excludeSprint = /Sprint-[0-9]+/gm;
    const excludePe = /PE-[0-9]+/gm;
    let ticketsToRemove = new Set();

    jiraTicketSet.forEach(ticket => {
      if (ticket.match(excludeSprint) || ticket.match(excludePe)) {
        ticketsToRemove.add(ticket);
      }
    });

    ticketsToRemove.forEach(ticket => jiraTicketSet.delete(ticket));

    const jiraTickets = Array.from(jiraTicketSet);

    console.log("List of Jira issues:");
    console.log(...jiraTickets);

    if (!Array.isArray(jiraTickets) || !jiraTickets.length) {
      console.log("There are no issues excluding PE in the commits or PR Titles!");
      console.log("NOTHING TO DO -- exiting no issues updated.");
      process.exit(0);
    }

    return jiraTickets;

  } catch (error) {
    console.error(`Error in filterTickets: ${error.message}`);
    throw error;
  }
}


async function changeState(singleIssue, state) {
  try {
    const transitions = await jira.listTransitions(singleIssue);
    const filteredTransition = transitions.transitions.find(t => t.name === state);

    if (!filteredTransition) {
      throw new Error(`Transition '${state}' not found for issue ${singleIssue}.`);
    }

    const transitionId = filteredTransition.id;

    await jira.transitionIssue(singleIssue, {
      transition: { id: transitionId }
    });

    console.log(`Issue ${singleIssue} transitioned to ${state}.`);
  } catch (error) {
    console.error(`Error in changeState: ${error.message}`);
    throw error;
  }
}

const titleTickets = titleQuery();
const commitTickets = commitQuery();
const filterTicketSet = filterTickets(titleTickets, commitTickets);


filterTicketSet
  .then(async (jiraTickets) => {
    console.log("Filtered Tickets: ");
    console.log(...jiraTickets);

    for (const jiraIssueID of jiraTickets) {
      try {
        const singleIssue = `${jiraIssueID}`;
        const issue = await jira.findIssue(singleIssue);
        const projectKey = issue.fields.project.key;

        console.log(projectKey);

        const releaseTitleA = {
          name: releaseTitle,
        };

        await jira.createVersion({
          name: releaseTitle,
          project: projectKey,
          description: fullDescription,
        }).then((e) => {
          console.log(`Project created ${projectKey}`);
        }).catch((e) => {
          console.log("Release page already exists");
        });

        await jira.updateIssue(singleIssue, {
          fields: { fixVersions: [releaseTitleA] },
        }).then((update) => {
          console.log(`Fix Version updated: ${singleIssue} to ${releaseTitle}`);
        });

        let state = "";
        if (projectKey === "FRBI") {
          state = "Released";
        } else if (projectKey === "OTEST") {
          state = "Done";
        } else {
          state = "Closed";
        }

        await changeState(singleIssue, state);

      } catch (error) {
        console.error(`Error processing ticket ${jiraIssueID}: ${error.message}`);
      }
    }
  })
  .catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });