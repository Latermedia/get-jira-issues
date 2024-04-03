const axios = require('axios');
const jiraApi = require('jira-client');

const githubApiUrl = 'https://api.github.com/repos/';
const githubPulls = '/pulls/';
const githubCommits = '/commits';
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
const fullDescription = 'Production Release for Sprint: ' + sprintName;
const versionStrip = versionNumber.match(/v(\d+\.\d+\.\d+)/);
const finalVersionNumber = versionStrip[1];
const releaseTitle = 'im-' + finalVersionNumber;
const jiraUrlStrip = jiraBaseUrl.match(/https:\/\/(\S*)/);
const jiraUrl = jiraUrlStrip[1];
const pattern = /[a-zA-Z]{2,}-[0-9]+/gm;

const prHeaders = {
  'Accept': 'application/vnd.github.v3+json',
  'Authorization': `Bearer ${githubToken}`,
};

const jira = new jiraApi({
   protocol: 'https',
   host: `${jiraUrl}`,
   username: `${jiraUser}`,
   password: `${jiraToken}`,
   apiVersion: '3',
   strictSSL: true
});

if (!repository) {
    console.error('REPO environment variable not provided.');
    process.exit(1);
}

if (!pullRequestNumber) {
    console.error('PR_NUMBER environment variable not provided.');
    process.exit(1);
}

 
const titleRespone = axios.get(githubPullFull, { headers: prHeaders })
  .then((prDataResponse1) => {
    let titleTicketSet = new Set();
    const prTitleCheck = prDataResponse1.data.title.match(pattern);
    if (prTitleCheck) { 
      titleTicketSet.add(prTitleCheck[0]);
      console.log("Added ticket from title to array: ");
      console.log(...titleTicketSet);
    }
    return titleTicketSet
  });

const commitResponse = axios.get(githubFullUrl, { headers: prHeaders })
  .then((prDataResponse) => {
    let commitTicketSet = new Set();
    let commitMessages = prDataResponse.data.map(commit => commit.commit.message);
    const excludeSprint = /Sprint-[0-9]+/gm;
    const excludePe = /PE-[0-9]+/gm;

    console.log(commitMessages)
    commitMessages.forEach(message => {
      const matches = message.match(pattern);
      if (matches) {
        matches.forEach(match => commitTicketSet.add(match));
      }
    });

    console.log("here")
    console.log(...jiraTicketSet)
    return commitTicketSet
  });


console.log("Commit: " + commitResponse);
console.log("Title: " + titleRespone)
// let jiraTicketSet = new Set(...titleRespone, ...commitResponse)
// console.log(jiraTicketSet)
	// jiraTicketSet.forEach(issue => {
	//   if (issue.match(excludeSprint)) {
	//     jiraTicketSet.delete(issue);
	//   }
	// });

  //   jiraTicketSet.forEach(issue => {
	//   if (issue.match(excludePe)) {
	//     jiraTicketSet.delete(issue);
	//   }
	// });

  //   const jiraTickets = Array.from(jiraTicketSet);
  //   console.log("List of Jira issues:");
  //   console.log(...jiraTickets);

  //   if (!Array.isArray(jiraTickets) || !jiraTickets.length){
  //         console.log("There are no issues in the commits or PR Titles!");
  //         console.log("NOTHING TO DO -- exiting no issues updated.");
  //         process.exit(1);
  //       }

  //   for (const jiraIssueID of jiraTickets) {
  //       try {
  //           const singleIssue = `${jiraIssueID}`;
  //           const issue = jira.findIssue(singleIssue);
  //           projectKeyListDup.push(issue.fields.project.key);
  //       } catch (err) {
  //           console.error(err);
  //           process.exit(1);
  //       }
  //   }

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