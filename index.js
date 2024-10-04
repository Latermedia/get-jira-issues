const axios = require("axios");
const jiraApi = require("jira-client");


// process.env variables
// const pullRequestNumber = process.env.PR_NUMBER;
const repository             = process.env.REPO;
const githubToken            = process.env.GH_API_TOKEN;
const jiraBaseUrl            = process.env.JIRA_SERVER;
const jiraUser               = process.env.JIRA_SERVICE_USER;
const jiraToken              = process.env.JIRA_SERVICE_API_TOKEN;
const versionNumber          = process.env.VERSION_NUMBER;
const previousVersionNumber  = process.env.PREVIOUS_VERSION_NUMBER;
const sprintName             = process.env.SPRINT_NAME;
const releaseBranch          = process.env.RELEASE_BRANCH

// github api setup
const githubApiUrl = "https://api.github.com/repos/";
const githubPulls = "/pulls/";
const githubCommits = "/commits";
const githubCommitHistoryURL = `${githubApiUrl}${repository}/commits`;
// const githubFullUrl = `${githubApiUrl}${repository}${githubPulls}${pullRequestNumber}${githubCommits}`;
// const githubPullFull = `${githubApiUrl}${repository}${githubPulls}${pullRequestNumber}`;

// Other variables
const fullDescription = "Production Release for Sprint: " + sprintName;
const versionStrip = versionNumber.match(/v(\d*.*)/);
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

if (!releaseBranch) {
  console.error("RELEASE BRANCH environment variable not provided.");
  process.exit(1);
}

if (!previousVersionNumber) {
  console.error("PREVIOUS_VERSION_NUMBER environment variable not provided.");
  process.exit(1);
}

// compare this release to previous release and tag all tickets
// previous release is tagged with version number and new release is sent in as var from action

const shaQuery = async () => {
  let lastVersionSHA = "";
  try {
      let tagResponse = await axios.get(`${githubCommitHistoryURL}/${previousVersionNumber}`, { headers: prHeaders });
      
      if (!tagResponse || !tagResponse.data.sha ) {
        throw new Error('Failed to fetch tag data from GitHub API.');
      }

      lastVersionSHA = tagResponse.data.sha;
    }
    catch (error) {
      console.error('Error in getLastReleaseSha:', error.message);
      throw error;
    }

  try {
    let jiraTicketSet = new Set();
    let lastCommitFound = false;

    // once we find the last commit, we stop going through paginated responses
    for (let i = 1; i <= 10; i++) {
      if(lastCommitFound) {
        break;
      }
      let shaResponse = await axios.get(`${githubCommitHistoryURL}?sha=${releaseBranch}&per_page=100&page=${i}`, { headers: prHeaders });

      if (!shaResponse || !shaResponse.data || !Array.isArray(shaResponse.data)) {
        throw new Error('Failed to fetch commit data from GitHub API page=${i}.');
      }

      // filter out everything after the lastVersionSha, reject everything after
      let commits = [];
      for(let commit of shaResponse.data){
        if (!commit || !commit.commit || !commit.commit.message) {
          console.warn('Commit message not found or invalid:', commit);
          return;
        }

        if (commit.sha != lastVersionSHA) {
          commits.push(commit);
        }
        else {
          lastCommitFound = true;
          break;
        }
      };

      commits.forEach(commit => {
        let matches = commit.commit.message.match(pattern);
        if (matches) {
          matches.forEach(match => jiraTicketSet.add(match));
        }
      });
    }

    if (jiraTicketSet.size > 0) {
      console.log("Added tickets from commit history to array:", ...jiraTicketSet);
    } else {
      console.log("No Jira tickets found in commit messages.");
    }

    return jiraTicketSet;

  } catch (error) {
    console.error('Error in shaQuery:', error.message);
    throw error;
  }
};

// const titleQuery = async () => {
//   try {
//     let titleResponse = await axios.get(githubPullFull, { headers: prHeaders });

//     if (!titleResponse || !titleResponse.data || !titleResponse.data.title) {
//       throw new Error('Failed to fetch pull request title from GitHub API.');
//     }

//     let jiraTicketSet = new Set();
//     const prTitleCheck = titleResponse.data.title.match(pattern);

//     if (prTitleCheck) {
//       prTitleCheck.forEach(match => jiraTicketSet.add(match));
//       console.log("Added tickets from title to array:", ...jiraTicketSet);
//     }

//     return jiraTicketSet;

//   } catch (error) {
//     console.error('Error in titleQuery:', error.message);
//     throw error;
//   }
// };


// const commitQuery = async () => {
//   try {
//     let jiraTicketSet = new Set();

//     for (let i = 1; i <= 10; i++) {
//       let commitResponse = await axios.get(`${githubFullUrl}?per_page=100&page=${i}`, { headers: prHeaders });

//       if (!commitResponse || !commitResponse.data || !Array.isArray(commitResponse.data)) {
//         throw new Error('Failed to fetch commit data from GitHub API page=${i}.');
//       }

//       commitResponse.data.forEach(commit => {
//         if (!commit || !commit.commit || !commit.commit.message) {
//           console.warn('Commit message not found or invalid:', commit);
//           return;
//         }

//         let matches = commit.commit.message.match(pattern);
//         if (matches) {
//           matches.forEach(match => jiraTicketSet.add(match));
//         }
//       });
//     }

//     if (jiraTicketSet.size > 0) {
//       console.log("Added tickets from commits to array:", ...jiraTicketSet);
//     } else {
//       console.log("No Jira tickets found in commit messages.");
//     }

//     return jiraTicketSet;

//   } catch (error) {
//     console.error('Error in commitQuery:', error.message);
//     throw error;
//   }
// };


async function filterTickets(titleTickets, commitTickets) {
  try {
    let jiraTicketSet = new Set();
    const titleT = Array.from(titleTickets);
	const commitT = Array.from(commitTickets);

    if (typeof titleTickets !== "undefined") {
      titleT.forEach(ticket => jiraTicketSet.add(ticket));
    }

    if (typeof commitTickets !== "undefined") {
      commitT.forEach(ticket => jiraTicketSet.add(ticket));
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

// No Longer Used
// async function changeState(singleIssue, state) {
//   try {
//     const transitions = await jira.listTransitions(singleIssue);
//     const filteredTransition = transitions.transitions.find(t => t.name === state);

//     if (!filteredTransition) {
//       throw new Error(`Transition '${state}' not found for issue ${singleIssue}.`);
//     }

//     const transitionId = filteredTransition.id;

//     await jira.transitionIssue(singleIssue, {
//       transition: { id: transitionId }
//     });

//     console.log(`Issue ${singleIssue} transitioned to ${state}.`);
//   } catch (error) {
//     console.error(`Error in changeState: ${error.message}`);
//     throw error;
//   }
// }

async function main() {
  try {
    // old way
    // const titleTickets = await titleQuery();
    // const commitTickets = await commitQuery();
    // const filterTicketSet = await filterTickets(titleTickets, commitTickets);
    
    // new way
    const filterTicketSet = await shaQuery();
    const projectKeyListFull = ["AFL", "AR", "BUG", "CMP", "ID", "LIB", "PE", "SD", "SDC", "SMAUG", "WHI"];
    // const projectKeyListFull = ["OTEST"];

    console.log("Project Release Pages Created: ");
    for (const projectKeyList of projectKeyListFull) {

      await jira.createVersion({
        name: releaseTitle,
        project: projectKeyList,
        description: fullDescription,
      }).then((e) => {
        console.log(`Project created ${projectKeyList}`);
      }).catch((e) => {
        console.log(`Release page already exists ${projectKeyList}`);
      });
	  }

    console.log("Filtered Tickets: ");
    console.log(...filterTicketSet);

    for (const jiraIssueID of filterTicketSet) {
      try {
        const singleIssue = `${jiraIssueID}`;
        const issue = await jira.findIssue(singleIssue);
        const projectKey = issue.fields.project.key;

        console.log(projectKey);

        const releaseTitleA = {
          name: releaseTitle,
        };

        await jira.updateIssue(singleIssue, {
          fields: { fixVersions: [releaseTitleA] },
        }).then((update) => {
          console.log(`Fix Version updated: ${singleIssue} to ${releaseTitle}`);
        });

    //     let state = "";
    //     if (projectKey === "FRBI") {
    //       state = "Released";
    //     } else if (projectKey === "OTEST") {
    //       state = "Done";
    //     } else {
    //       state = "Closed";
    //     }

    //     await changeState(singleIssue, state);
      } catch (error) {
        console.error(`Error processing ticket ${jiraIssueID}: ${error.message}`);
      }
    }

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();