# get-jira-issues
GitHub Action: Gets issue IDs from github Pull Request commit messages

## Workflow Required Environment Variables
```
env:
  PR_NUMBER: ${{ github.event.pull_request.number }}
  REPO: ${{ github.repository }}
  GH_API_TOKEN: ${{ secrets.GH_API_TOKEN }}
```

## Workflow Use
```
get-jira-issues:
   name: get-jira-issues
   runs-on: ubuntu-latest
   steps:
    - name: Get Jira Issues
      uses: Latermedia/get-jira-issues@v1
      id: get-issues
```

## What it does
* Get the commit messages from the PR in github
* Extract the Jira issues using the regex below
* Output an array with the list of Jira issues

## REGEX
`/([A-Z]{2,}-[0-9]+)/gm`