async function fetchReposAndAssets() {
  try {
    const response = await fetch("./manifests/repos_data.json");
    const data = await response.json();

    const repoSelect = document.getElementById("repo-select");
    data.forEach((repo) => {
      const option = document.createElement("option");
      option.value = repo.name;
      // Strip out the account/organization/user name from the display text
      option.textContent = repo.name.split("/").pop();
      repoSelect.appendChild(option);
    });

    // Fetch and update the last updated footer
    const lastUpdatedResponse = await fetch("./manifests/lastUpdated.txt");
    const lastUpdated = await lastUpdatedResponse.text();
    const lastUpdatedElement = document.getElementById("last-updated");
    lastUpdatedElement.textContent = `Last updated: ${new Date(lastUpdated).toLocaleString()}`;
  } catch (error) {
    console.error("Error fetching repos data:", error);
  }
}

function populateVersions() {
  const repoSelect = document.getElementById("repo-select");
  const assetSelect = document.getElementById("asset-select");
  const selectedRepo = repoSelect.value;

  assetSelect.innerHTML = '<option value="" disabled selected>Select firmware version</option>';

  fetch("./manifests/repos_data.json")
    .then((response) => response.json())
    .then((data) => {
      const repoData = data.find((repo) => repo.name === selectedRepo);
      if (repoData) {
        repoData.releases.forEach((release) => {
          const optgroup = document.createElement("optgroup");
          optgroup.label = release.tag;

          release.manifests.forEach((manifest) => {
            const option = document.createElement("option");
            option.value = manifest.manifest;
            option.textContent = manifest.name;
            optgroup.appendChild(option);
          });

          assetSelect.appendChild(optgroup);
        });
      }
    })
    .catch((error) => console.error("Error fetching versions:", error));
}

document.getElementById("asset-select").addEventListener("change", function () {
  const assetSelect = document.getElementById("asset-select");
  const installButton = document.querySelector("esp-web-install-button");
  installButton.setAttribute("manifest", assetSelect.value);
});
