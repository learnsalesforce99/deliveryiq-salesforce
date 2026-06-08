# DeliveryIQ — End-to-End Pipeline Demo Script

## How to Run the Full Pipeline in Claude Desktop

Copy and paste this prompt into Claude Desktop to trigger the complete automated pipeline:

---

### 🚀 Full Pipeline Prompt (copy this into Claude Desktop)

```
You are the DeliveryIQ Build Agent. Execute the complete automated development pipeline for Jira story SCRUM-5.

Follow these steps in order:

**Phase 1 — Story Analysis:**
1. Use jira_get_story to fetch SCRUM-5 details
2. Use jira_get_attachments to check for any specs on SCRUM-5
3. Use sf_retrieve_metadata to list existing ApexClass components in the org
4. Use jira_update_status to move SCRUM-5 to "In Progress"
5. Use jira_add_comment to post: "🤖 Build Agent: Story analysis complete. Starting code generation."

**Phase 2 — Code Generation & GitHub:**
6. Based on the story requirements, generate appropriate Apex class and test class code
7. Use github_create_branch to create branch "feature/SCRUM-5" from main (skip if already exists)
8. Use github_commit_files to commit the generated Apex files to the branch
9. Use jira_add_comment to post what files were generated and committed

**Phase 3 — Compliance & PR:**
10. Review the generated code against Salesforce best practices (bulkification, error handling, security)
11. Use github_create_pr to create a PR from feature/SCRUM-5 into main with a compliance report in the body
12. Use jira_update_status to move SCRUM-5 to "In Review"
13. Use jira_add_comment to post the PR link and compliance summary

Report your progress at each step.
```

---

## What the Pipeline Produces

After running the above prompt, you will have:

| Artifact | Location |
|---|---|
| Apex Service Class | `force-app/main/default/classes/` in GitHub |
| Apex Test Class | `force-app/main/default/classes/` in GitHub |
| Feature Branch | `feature/SCRUM-5` in `learnsalesforce99/deliveryiq-salesforce` |
| Pull Request | GitHub PR with compliance report |
| Jira Updates | Story moved to "In Review" with 3 progress comments |

---

## Phase 5 — Deploy (run after PR is merged)

```
You are the DeliveryIQ Deploy Agent. SCRUM-5 PR has been approved and merged.

1. Use sf_run_tests to run any test classes that exist in the org
2. Use sf_deploy to deploy force-app/main/default to the healthdev org with RunLocalTests
3. Use jira_update_status to move SCRUM-5 to "Done"
4. Use jira_add_comment to post the deployment summary including deploy ID, components deployed, and test results
```

---

## GitHub Actions Setup (for automated CI/CD)

The workflow file `.github/workflows/salesforce-deploy.yml` is already in the repo.

To enable it, add this secret to your GitHub repo:
1. Go to `https://github.com/learnsalesforce99/deliveryiq-salesforce/settings/secrets/actions`
2. Click **New repository secret**
3. Name: `SF_AUTH_URL`
4. Value: Run `sf org display --target-org healthdev --verbose --json` and copy the `sfdxAuthUrl` value

Once set, every push to `main` with changes in `force-app/` will auto-validate against Salesforce.
