import { Octokit } from '@octokit/rest';
import confJson from '../../src-tauri/tauri.conf.json'
import { computed, ref } from 'vue'
import { delay } from 'vue3-ts-util'
import { getVersion } from '@/api'
import { ReturnTypeAsync } from '.'


const octokit = new Octokit();
export const localFeTag = 'v' + confJson.package.version
export const latestCommit = ref<ReturnTypeAsync<typeof getLatestCommit>>()
export const latestTag = ref('')
export const localBeHash = ref('')
export const localBeTag = ref('')

export const version = computed(() => ({
  tag: localBeTag.value || localFeTag,
  hash: localBeHash.value
}))

export const hasNewRelease = computed(() => {
  if (!latestTag.value) {
    return false
  }
  return latestTag.value !== version.value.tag
})



async function getLatestCommit(owner: string, repo: string) {
  try {
    const response = await octokit.repos.listCommits({
      owner,
      repo,
      per_page: 1,
    });
    const latestCommit = response.data[0];
    // console.log('Latest Commit:', latestCommit);
    return latestCommit;
  } catch (error) {
    console.error('Error fetching the latest commit:', error);
  }
}

async function getLatestRelease(owner: string, repo: string) {
  try {
    const response = await octokit.repos.getLatestRelease({
      owner,
      repo,
    });
    const latestRelease = response.data;
    // console.log('Latest Release:', latestRelease);
    return latestRelease;
  } catch (error) {
    console.error('Error fetching the latest release:', error);
  }
}

const owner = 'zanllp';
const repo = 'sd-webui-infinite-image-browsing';

delay(500 + 500 * Math.random()).then(async () => {
  getVersion().then((resp) => {
    localBeTag.value = resp.tag ?? ''
    localBeHash.value = resp.hash ?? ''
  })
  latestCommit.value = await getLatestCommit(owner, repo);
  const release =  await getLatestRelease(owner, repo);
  latestTag.value = release?.tag_name ?? ''
})