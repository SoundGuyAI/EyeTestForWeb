# Privacy principles

## 1. Default promise

EyeTestForWeb should perform camera processing locally in the browser. The MVP will not upload, transmit, or intentionally persist camera frames.

## 2. Data classes

### Camera frames

- Used transiently for local analysis
- Not recorded by default
- Not written to browser storage
- Released when no longer needed

### Derived eye observations

- Blink scores, state changes, timing, and quality values
- Kept in bounded memory buffers
- Cleared when the session ends or page reloads

### Future respiration signals

- Motion traces, color traces, cycle timing, rate, rhythm, and confidence
- Treated as sensitive physiological data
- Not persisted or exported without explicit user action

### Settings

Non-sensitive preferences such as alert delay, sound enabled, and interface theme may be stored locally. Stored settings must be documented and resettable.

## 3. Permissions

- Explain why camera access is needed before requesting it.
- Request access only after a user gesture.
- Provide useful instructions if permission is denied.
- Show an obvious active-camera state.
- Stop camera tracks when the user ends a session.

## 4. Analytics

The initial implementation should have no third-party analytics. If analytics are later added, they must be opt-in and must not include:

- Images or video
- Face landmarks or embeddings
- Eye or respiration time series
- Precise session timestamps tied to identity
- Persistent cross-site identifiers

## 5. Exports and research data

Any future export or research mode must:

- Be separate from normal operation
- Explain the exact fields and purpose
- Require informed opt-in
- Minimize data
- Support deletion and withdrawal where applicable
- Follow an approved consent and data-governance process before collecting participant video

## 6. Public hosting implications

GitHub Pages and all files deployed to it are public. No API keys, credentials, participant data, private model artifacts, or sensitive configuration may be committed to this repository.
