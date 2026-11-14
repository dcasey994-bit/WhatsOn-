# Releasing the apps

Changing a version here and pushing to `claude/live-events-map-vRHxH` starts
that platform's release build. It is how Claude starts a release, since it can
push but cannot press GitHub's "Run workflow" button. The button still works
too, and overrides these files.

| File | Starts | Result |
|---|---|---|
| `android-version` | Android release bundle | signed `.aab` in the run's Artifacts — upload it in Play Console |
| `ios-version` | iOS release build | uploaded to App Store Connect → appears in TestFlight |

- One line, the version users see, e.g. `1.1.0`. Bump it for every release:
  the build number (Android versionCode / iOS build) comes from the run number
  and goes up on its own, but the version name should move too.
- iOS builds run on macOS at 10× the Actions minutes. Only change
  `ios-version` when an iPhone build is wanted.
- Change only the file for the platform you mean to build. Editing anything
  else never starts a release.
