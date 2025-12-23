# Automated Task Assistant Core  
### GitHub Action · Workflow Engine for Repo Automation

`task-assistant-core` is the execution engine behind the Automated Task Assistant GitHub App.  
It provides:

- Issue classification (track labels)
- Milestone enforcement
- Stale issue detection
- Telemetry event generation
- File updates inside your repository

This Action is designed to be consumed by Automated Task Assistant inside a repo.

---

## 🚀 Usage

```yaml
steps:
  - name: Run Automated Task Assistant Core
    uses: automated-assistant-systems/task-assistant-core@v1
    with:
      config-path: .github/orchestrator.yml
📁 Repository Structure
src/
  index.ts
  config.ts
  githubClient.ts
  issueClassifier.ts
  milestoneManager.ts
  milestoneRules.ts
  staleLogic.ts
  telemetry.ts
Compiled output is published under:

📦 Development
Install dependencies:

npm install
Build:

npm run build
🧪 Testing (future)
Unit tests will be added using Vitest.

🏷 Versioning
Releases follow semantic versioning.
The v1 tag always points to the latest stable 1.x release.

To release:

git tag v1.0.1
git push origin v1.0.1
🔒 Security
No external services are contacted by this Action.
All operations run within GitHub-hosted or self-hosted runners.

📄 License
MIT License.

