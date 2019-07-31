import os
import requests
from git import Repo
import boto3
import shutil

client = boto3.client('codecommit')
os.environ['HOME'] = '/var/task'
gitHubRepo = os.environ['GITHUB_REPO'])
gitHubRepoList = os.environ['GITHUB_REPO_LIST'])

def clone(repoName):
    localDir=f'/tmp/{repoName}'
    try:
        shutil.rmtree(localDir)
    except:
        pass
    repoUrl = f"{gitHubRepo}/{repoName}.git"
    localRepo = Repo.clone_from(repoUrl, localDir)
    print(f'Cloned repo: {repoName}')
    remoteRepo = getOrMakeRepo(repoName)
    print("Created remote repo")
    remote = localRepo.create_remote(name=remoteRepo['repositoryName'], url=remoteRepo['cloneUrlHttp'])
    print('Created remote')
    remote.push(refspec='master:master')
    print('Pushed to master')

def getOrMakeRepo(repoName):
    try:
        ccRepo = client.get_repository(repositoryName=repoName)
    except client.exceptions.RepositoryDoesNotExistException:
        ccRepo = client.create_repository(repositoryName=repoName)
    except:
        print("Somthing else has gone wrong accessing CodeCommit")
        raise Exception("Somthing else has gone wrong accessing CodeCommit")

    print(ccRepo)
    return ccRepo['repositoryMetadata']

def run(event, context):
    #Get a list of repos as JSON
    repoList = requests.get(gitHubRepoList).json()
    #Run over each repo
    for repoName in repoList["repos"]:
        print(repoName)
        clone(repoName)