# gitbackup

This project used SAM to deploy a Lambda Function to schedule backups from a GitHub repo.
### Prereqs
Deploy this SAM template and get the Layer ARN
https://github.com/aws-samples/aws-lambda-layer-awscli

### Instructions
```bash
#Clone the repo
git clone https://github.com/msimpsonnz/gitbackup.git
#Go to newly cloned directory
cd ./gitbackup
#Edit the JSON file and the public repos you want to backup
cat repo.json
#Save and push your changes
git commit -m 'updated repo.json'
# Get and update the following variables
export GITHUB_REPO='https://github.com/<Your Github Account>'
export GITHUB_REPO_LIST='https://github.com/<Your Github Account>'
export EMAIL='<Your Email for Notification>'
export LayerAWSCLI='<AWS CLI Layer ARN from above>'

