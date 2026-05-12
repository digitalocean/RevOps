# Pushing Meridian code to GitHub

## One-time setup (if not done)

1. **Clone the repo** (if you’re on a new machine):
   ```bash
   git clone https://github.com/digitalocean/RevOps.git
   cd RevOps
   ```

2. **Use the Meridian branch**:
   ```bash
   git checkout meridian
   ```

3. **Confirm remote**:
   ```bash
   git remote -v
   ```
   You should see `origin` pointing to your GitHub repo.

---

## Regular workflow: push your changes

### 1. See what changed
```bash
cd /path/to/agileops-full   # or your repo folder
git status
```

### 2. Stage changes
```bash
# Stage everything
git add -A

# Or stage specific files
git add frontend/src/App.jsx backend/server.js
```

### 3. Commit
```bash
git commit -m "Short description of what you changed"
```

Example messages:
- `Add new campaign modal`
- `Fix API URL for production`
- `Update deploy docs`

### 4. Push to GitHub
```bash
git push origin meridian
```

If this branch is already tracking `origin/meridian`:
```bash
git push
```

---

## Using a new branch for a feature

```bash
# Create and switch to a new branch
git checkout -b my-feature

# Make changes, then:
git add -A
git commit -m "Describe your feature"
git push -u origin my-feature
```

Then open a Pull Request from `my-feature` into `meridian` on GitHub.

---

## Quick reference

| Task              | Command                    |
|-------------------|----------------------------|
| Current branch    | `git branch`               |
| Switch to meridian| `git checkout meridian`    |
| Latest from GitHub| `git pull origin meridian`  |
| Push your commits | `git push origin meridian` |
| See remotes       | `git remote -v`             |

---

## If push is rejected

Remote has new commits (e.g. someone else pushed):

```bash
git pull origin meridian
# Fix any conflicts if needed, then:
git push origin meridian
```
