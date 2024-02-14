# get-jira-issues
GitHub Action: Gets issue IDs from github Pull Request commit messages, create Jira release pages, update fixVersion field, and close the issue.

## Workflow Required Environment Variables
```
env:
  PR_NUMBER: ${{ github.event.pull_request.number }}
  REPO: ${{ github.repository }}
  GH_API_TOKEN: ${{ secrets.GH_API_TOKEN }}
  JIRA_SERVICE_API_TOKEN: ${{ secrets.JIRA_SERVICE_API_TOKEN }}
  JIRA_SERVICE_USER: ${{ secrets.JIRA_SERVICE_USER }}
  JIRA_SERVER: ${{ secrets.JIRA_SERVER }}
```

## Workflow Use
```
jobs:
  get-jira-issues:
    if: ${{ github.event.pull_request.merged }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source
        uses: actions/checkout@v4
        with:
          repository: ${{ secrets.GH_ORG }}/release-scripts
          ref: refs/heads/main
          path: './branching'
          token: ${{ secrets.GH_API_TOKEN }}

      - name: Read Sprint Name from File
        id: sprint_read
        uses: juliangruber/read-file-action@v1
        with:
          path: /home/runner/work/mvk-core/mvk-core/branching/branching/sprint-name.txt

      - name: Checkout Source
        uses: actions/checkout@v4
        with:
          repository: ${{ secrets.GH_ORG }}/release-scripts
          ref: refs/heads/main
          path: './tagging'
          token: ${{ secrets.GH_API_TOKEN }}

      - name: Read Sprint Name from File
        id: version_read
        uses: juliangruber/read-file-action@v1
        with:
          path: /home/runner/work/mvk-core/mvk-core/tagging/tagging/version-number.txt

      - name: Get Issues
        env:
          SPRINT_NAME: ${{ steps.sprint_read.outputs.content }}
          VERSION_NUMBER: ${{ steps.version_read.outputs.content }}
        uses: Latermedia/get-jira-issues@v1
        id: get-issues
```

## What it does
* Get the commit messages from the PR in github
* Extract the Jira issues using the regex below
* Create a Jira release page for each project
* Update the fixVersion field with the project page name
* Close or Release(FRBI - project) the issue

## REGEX
`/([A-Z]{2,}-[0-9]+)/gm`