import { execa } from 'execa'

async function collectCommits({ ref, github, context, core }) {
  const config = {
    ref,
    before: context?.payload?.before,
    after: context?.payload?.after,
  }

  const payloadCommits = (context?.payload?.commits || []).map((commit) => ({
    sha: commit.id,
    message: commit.message,
  }))

  const { data: apiCommits } = await github.rest.repos.listCommits({
    owner: context.repo.owner,
    repo: context.repo.repo,
    sha: ref,
  })

  let commits = []

  if (payloadCommits?.length) {
    commits = payloadCommits.map((commit) => ({
      ...commit,
      ...apiCommits.find((c) => c.sha === commit.sha),
    }))
  } else if (context?.payload?.pull_request?._links?.commits?.href) {
    const { data: prCommits } = await github.request(
      context.payload.pull_request._links.commits.href,
    )

    if (prCommits?.length) {
      commits = prCommits.map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message,
        parents: commit.parents,
      }))
    }
  }

  if (!commits.length && apiCommits?.length) {
    if (!config.before || !config.after) {
      console.log(JSON.stringify(context, null, 2))
      throw new Error('No commits to verify')
    }
    console.log(
      JSON.stringify(config, null, 2),
      '__CONTEXT__',
      JSON.stringify(context, null, 2),
    )

    const startIndex = Math.max(
      apiCommits.findIndex((commit) => commit.sha === config.before),
      0,
    )
    const endIndex = Math.min(
      apiCommits.findIndex((commit) => commit.sha === config.after) + 1,
      apiCommits.length - 1,
    )
    commits = apiCommits
      .slice(startIndex, endIndex)
      .map((commit) => ({ message: commit.commit.message, sha: commit.sha }))
  }

  if (!commits.length) {
    throw new Error('No commits to verify')
  }

  const commitsWithoutMessage = commits.filter((commit) => !commit?.message)

  if (commitsWithoutMessage.length) {
    console.log('commitsWithoutMessage', commitsWithoutMessage)
    console.log('apiCommits', apiCommits)
    console.log('payloadCommits', payloadCommits)
    throw new Error('Commits without message')
  }

  return commits.map((commit) => ({
    ...commit,
    isMerge:
      (commit?.parents?.length && commit?.parents?.length > 1) ||
      commit.message.includes('Merge branch'),
  }))
}

const verifyCommit = async ({ message, sha, isMerge }) => {
  if (isMerge) {
    return {
      sha,
      state: 'success',
      description: 'Merge commit',
    }
  }
  if (message.startsWith('🚢')) {
    return {
      sha,
      state: 'success',
      description: 'Valid release commit',
    }
  }

  const { stdout, stderr, exitCode } = await execa(
    'verify-emoji-commit',
    [message],
    { reject: false },
  )

  return {
    sha,
    state: exitCode === 0 ? 'success' : 'failure',
    description: (exitCode === 0 ? stdout : stderr)
      .replaceAll('🎉', ':tada:')
      .replaceAll('🚀', ':rocket:')
      .replaceAll('🐛', ':bug:')
      .replaceAll('🔥', ':fire:')
      .replaceAll('🚢', ':ship:')
      .replaceAll('🌹', ':rose:')
      .replaceAll('💥', ':boom:'),
  }
}

export default async function ({ ref, jobUrl, github, context, core }) {
  const target_url =
    jobUrl &&
    jobUrl.includes(context.repo.owner) &&
    jobUrl.includes(context.repo.repo)
      ? jobUrl
      : `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`

  const commits = await collectCommits({ ref, github, context, core })

  const results = await Promise.all(commits.map(verifyCommit))

  console.log(
    'results',
    results.map((r, index) => ({
      ...r,
      message: commits[index].message,
    })),
  )

  await Promise.all(
    results.map((commit) => {
      return github.rest.repos.createCommitStatus({
        owner: context.repo.owner,
        repo: context.repo.repo,
        target_url,
        context: context.workflow,
        ...commit,
      })
    }),
  )
}
