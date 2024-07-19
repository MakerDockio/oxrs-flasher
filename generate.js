require("dotenv").config();

const fs = require("fs");
const axios = require("axios");
const path = require("path");

const githubAccounts = [
  { name: "OXRS-IO", type: "organization" },
  { name: "Bedrock-Media-Designs", type: "organization" },
  { name: "sumnerboy12", type: "users" },
  { name: "austinscreations", type: "users" },
];

const githubApiBaseUrl = "https://api.github.com";
const GITHUB_API_TOKEN = process.env.GITHUB_API_TOKEN;

if (!GITHUB_API_TOKEN) {
  throw new Error("Missing GitHub API token in environment variables");
}

const getRepos = async (account) => {
  const { name, type } = account;
  const endpoint = type === "organization" ? "orgs" : "users";
  const url = `${githubApiBaseUrl}/${endpoint}/${name}/repos`;
  const response = await axios.get(url, {
    headers: { Authorization: `token ${GITHUB_API_TOKEN}` },
  });
  return response.data;
};

const filterRepos = (repos) => {
  return repos.filter((repo) => repo.name.includes("OXRS") && repo.name.includes("FW"));
};

const getReleases = async (owner, repo) => {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases`;
  const response = await axios.get(url, {
    headers: { Authorization: `token ${GITHUB_API_TOKEN}` },
  });
  return response.data;
};

const parseChipFamily = (filename) => {
  const chipFamilyMatch = filename.match(/(ESP32-S3|ESP32-S2|ESP32-C3|ESP8266|ESP32)/);
  return chipFamilyMatch ? chipFamilyMatch[0] : "Unknown";
};

const generateManifest = async () => {
  const manifestsDir = path.resolve(__dirname, "docs", "manifests");
  await fs.promises.mkdir(manifestsDir, { recursive: true });

  const reposData = [];

  for (const account of githubAccounts) {
    const repos = await getRepos(account);
    const filteredRepos = filterRepos(repos);

    for (const repo of filteredRepos) {
      const releases = await getReleases(repo.owner.login, repo.name);
      const repoData = {
        name: `${repo.owner.login}/${repo.name}`,
        releases: [],
      };

      let hasFlashBinaries = false;

      for (const release of releases) {
        const releaseData = {
          tag: release.tag_name.replace("v", ""),
          manifests: [],
        };

        for (const asset of release.assets) {
          if (asset.name.includes("_FLASH.")) {
            hasFlashBinaries = true;
            const chipFamily = parseChipFamily(asset.name);
            const manifest = {
              name: asset.name,
              version: release.tag_name.replace("v", ""),
              new_install_prompt_erase: true,
              builds: [
                {
                  chipFamily: chipFamily,
                  parts: [
                    {
                      path: `https://github.com/${repo.owner.login}/${repo.name}/releases/download/${release.tag_name}/${asset.name}`,
                      offset: 0,
                    },
                  ],
                },
              ],
            };

            const manifestFileName = `${path.basename(asset.name, ".bin")}_manifest.json`;
            const manifestFilePath = path.join(manifestsDir, manifestFileName);
            await fs.promises.writeFile(manifestFilePath, JSON.stringify(manifest, null, 2));
            console.log(`Created manifest: ${manifestFilePath}`);

            releaseData.manifests.push({
              name: asset.name,
              manifest: `/docs/manifests/${manifestFileName}`,
            });
          }
        }
        if (releaseData.manifests.length > 0) {
          repoData.releases.push(releaseData);
        }
      }
      if (hasFlashBinaries) {
        reposData.push(repoData);
      }
    }
  }

  const reposDataPath = path.join(manifestsDir, "repos_data.json");
  await fs.promises.writeFile(reposDataPath, JSON.stringify(reposData, null, 2));
  console.log(`Created repos data file: ${reposDataPath}`);

  const lastUpdatedPath = path.join(manifestsDir, "lastUpdated.txt");
  const lastUpdated = new Date().toISOString();
  await fs.promises.writeFile(lastUpdatedPath, lastUpdated);
  console.log(`Updated lastUpdated file: ${lastUpdatedPath}`);
};

generateManifest()
  .then(() => console.log("Manifests and repos data generated successfully"))
  .catch((error) => console.error("Error generating manifests and repos data:", error));
