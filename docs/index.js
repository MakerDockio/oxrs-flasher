async function fetchReposAndAssets() {
  try {
    const response = await fetch("./manifests/repos_data.json");
    const data = await response.json();

    const repoSelect = document.getElementById("repo-select");
    data.forEach((repo) => {
      const option = document.createElement("option");
      option.value = repo.name;
      option.textContent = repo.name.split("/").pop();
      repoSelect.appendChild(option);
    });

    // Fetch latest successful GitHub Action run
    const githubApiUrl = "https://api.github.com/repos/MakerDockio/oxrs-flasher/actions/runs?per_page=10";
    const actionsResponse = await fetch(githubApiUrl, {
      headers: { "User-Agent": "OXRS-Flasher" }
    });
    const actionsData = await actionsResponse.json();

    // Find the first run that is completed and successful
    const latestSuccessfulRun = actionsData.workflow_runs.find(run =>
      run.status === "completed" && run.conclusion === "success"
    );

    const lastUpdatedElement = document.getElementById("last-updated");

    if (latestSuccessfulRun && latestSuccessfulRun.run_started_at) {
      const updatedDate = new Date(latestSuccessfulRun.run_started_at);
      const formatted = `Last updated: ${updatedDate.toLocaleDateString("en-GB")}, ${updatedDate.toLocaleTimeString("en-GB")}`;
      lastUpdatedElement.textContent = formatted;
    } else {
      lastUpdatedElement.textContent = "Last updated: No successful builds yet";
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    document.getElementById("last-updated").textContent = "Last updated: Error";
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
