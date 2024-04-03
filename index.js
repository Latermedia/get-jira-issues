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

const titleTickets = async() => {
  let titleResponse = await axios.get(githubPullFull, { headers: prHeaders });
  let jiraTicketSet = new Set();
  const prTitleCheck = titleResponse.data.title.match(pattern);
  console.log("PR Title: " + prTitleCheck);
  if (prTitleCheck) {
    jiraTicketSet.add(prTitleCheck[0]);
    console.log("Added ticket from title to array: ");
    console.log(...jiraTicketSet);
  }

  return jiraTicketSet;
};

const commitTickets = async() => {
  let jiraTicketSet = new Set();
  let commitResponse = await axios.get(githubFullUrl, { headers: prHeaders });
  let commitMessages = commitResponse.data.map((commit) => commit.commit.message);

  commitMessages.forEach((message) => {
    const matches = message.match(pattern);
    if (matches) {
      matches.forEach((match) => jiraTicketSet.add(match));
    }
  });

  return jiraTicketSet;
}

async function filterTickets(titleTickets,commitTickets) {
  let jiraTicketSet = new Set();

  // console.log(...commitTickets)
  console.log(...titleTickets)

  // return new Promise((jiraTicketSet) => {
  //   const excludeSprint = /Sprint-[0-9]+/gm;
  //   const excludePe = /PE-[0-9]+/gm;

  //   console.log(jiraTicketSet);
  //   jiraTicketSet.forEach((issue) => {
  //     if (issue.match(excludeSprint)) {
  //       jiraTicketSet.delete(issue);
  //     }
  //   });

  //   jiraTicketSet.forEach((issue) => {
  //     if (issue.match(excludePe)) {
  //       jiraTicketSet.delete(issue);
  //     }
  //   });

  //   const jiraTickets = Array.from(jiraTicketSet);
  //   console.log("List of Jira issues:");
  //   console.log(...jiraTickets);

  //   if (!Array.isArray(jiraTickets) || !jiraTickets.length) {
  //     console.log("There are no issues in the commits or PR Titles!");
  //     console.log("NOTHING TO DO -- exiting no issues updated.");
  //     process.exit(1);
  //   }
  // }).then((tickets) => jiraTicketSet);

  return "Hello";
}
console.log(filterTickets(titleTickets,commitTickets))
// let jiraTicketSet = new Set(...titleRespone, ...commitResponse)
// console.log(jiraTicketSet)

//
// for (const jiraIssueID of jiraTickets) {
//   try {
//     const singleIssue = `${jiraIssueID}`;
//     const issue = jira.findIssue(singleIssue);
//     projectKeyListDup.push(issue.fields.project.key);
//   } catch (err) {
//     console.error(err);
//     process.exit(1);
//   }
// }

// let projectKeyList = [...new Set(projectKeyListDup)];
//   console.log("The unique Project key list:");
//   console.log([...projectKeyList]);

//   const createProject = projectKeyList.map((jiraProjectKey) => {
//       const singleKey = `${jiraProjectKey}`;
//       try {
//           jira.createVersion({
//               name: releaseTitle,
//               project: singleKey,
//               description: fullDescription
//           });
//           console.log(`Project page created: ${singleKey}`);
//       } catch (err) {
//           console.error(err);
//           process.exit(1);
//       }
//   });
//   Promise.all(createProject);

//   for (const jiraIssueID2 of jiraTickets) {
//       try {
//           const singleIssue2 = `${jiraIssueID2}`;

//           const jiraIssue2 = jira.findIssue(singleIssue2);
//           const projectKey = (jiraIssue2.fields.project.key);

//           const releaseTitleA = {
//               name: releaseTitle
//           }

//           jira.updateIssue(singleIssue2, { fields: { fixVersions: [releaseTitleA] } });
//           console.log(`Fix Version updated: ${singleIssue2} to ${releaseTitle}`);

//           if (projectKey === 'FRBI') {
//               const transitions = jira.listTransitions(singleIssue2);
//               const filteredTransition = transitions.transitions.filter(t => t.name === 'Released');

//               const filterId = filteredTransition[0].id + "";
//               const transitionId = parseInt(filterId);

//               jira.transitionIssue(singleIssue2, { transition: { id: transitionId } });
//               console.log(`Issue ${singleIssue2} transitioned to Released.`);
//           } else {
//               const transitions = jira.listTransitions(singleIssue2);
//               const filteredTransition = transitions.transitions.filter(t => t.name === 'Closed');

//               const filterId = filteredTransition[0].id + "";
//               const transitionId = parseInt(filterId);

//               jira.transitionIssue(singleIssue2, { transition: { id: transitionId } });
//               console.log(`Issue ${singleIssue2} transitioned to Closed.`);
//           }

//       } catch (err) {
//           console.error(err);
//           process.exit(1);
//       }
//   }
// })
// .catch(error => {
//   console.error(`Error: ${error.message}`);
//   process.exit(1);
// });
