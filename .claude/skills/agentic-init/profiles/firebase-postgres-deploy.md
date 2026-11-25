# Deploy setup (Google Cloud + GitHub)

<!-- Copied by /agentic-init to docs/deploy-setup.md with the placeholders filled in.
     <project-id>, <project-number>, <region>, <github-repo> (owner/name), <developer-email>.
     Every step here was needed on a real first deploy. Do them in order, before enabling the deploy job. -->

One-time setup so that every merge to `main` deploys automatically and every pull request gets a preview URL. The developer does it with their own account. The project owner is needed only for step 0.

Most steps are copy-paste into **Cloud Shell** (console.cloud.google.com, project selected, the `>_` icon). Passwords are never typed or shown: they are generated straight into Secret Manager.

**Order:** steps 0 to 2, then run `db/cloud/roles.sql` (step 3), then steps 4 to 8, then enable the deploy job in CI. The merge that enables it is the first deploy.

## Step 0: access (project owner, about 10 minutes)

- Create the Firebase project, upgrade it to Blaze, and set a budget alert.
- Grant the developer these roles (Console: IAM & Admin -> IAM -> Grant access):
  - `Editor`
  - `Project IAM Admin` (lets the developer grant the narrow, temporary roles below)
  - `Service Account Admin`
- **If the project is in the client's Google Workspace organization**, granting an outside address fails with `IAM policy update failed ... Domain Restricted Sharing`. The owner lifts it for this project only, in Cloud Shell:

  ```bash
  cat > policy.yaml <<'EOF'
  name: projects/<project-id>/policies/iam.allowedPolicyMemberDomains
  spec:
    rules:
    - allowAll: true
  EOF
  gcloud org-policies set-policy policy.yaml
  ```

  Newer organizations may also enforce `iam.managed.allowedPolicyMembers`: turn its enforcement off for the project (IAM & Admin -> Organization Policies -> the policy -> Manage policy -> Override parent's policy -> Enforcement: Off). Check both with `gcloud org-policies describe <policy> --project=<project-id> --effective`, then grant the roles with `gcloud projects add-iam-policy-binding`.

## Step 1: Cloud Shell variables and APIs

Run this line again every time Cloud Shell restarts:

```bash
export PROJECT=<project-id> PROJECT_NUMBER=<project-number> REGION=<region> INSTANCE=app-db DB=app ME=<developer-email>
gcloud config set project $PROJECT
```

Enable every API the first deploy needs, so it does not stop on them one by one:

```bash
gcloud services enable sqladmin.googleapis.com secretmanager.googleapis.com cloudfunctions.googleapis.com run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com iamcredentials.googleapis.com sts.googleapis.com identitytoolkit.googleapis.com firebasehosting.googleapis.com cloudresourcemanager.googleapis.com compute.googleapis.com eventarc.googleapis.com pubsub.googleapis.com storage.googleapis.com firebaseextensions.googleapis.com cloudbilling.googleapis.com firebase.googleapis.com
```

**Identity Platform** (in the browser): enable it from **Cloud Console** -> Identity Platform -> Enable. The "Upgrade" button in the Firebase console requires Owner; the Cloud Console path works with Editor. Then, if the app is multi-tenant: Identity Platform -> Settings -> Security -> **Allow tenants** -> Save.

## Step 2: database server and passwords

```bash
gcloud sql instances create $INSTANCE --database-version=POSTGRES_16 --edition=ENTERPRISE --tier=db-f1-micro --region=$REGION --storage-type=SSD --storage-size=10 --storage-auto-increase --backup-start-time=01:00 --enable-point-in-time-recovery --deletion-protection
gcloud sql databases create $DB --instance=$INSTANCE
for S in DB_ADMIN_PASSWORD DB_OWNER_PASSWORD DB_PASSWORD; do openssl rand -base64 32 | tr -d '/+=\n' | gcloud secrets create $S --data-file=- --replication-policy=user-managed --locations=$REGION; done
```

Editor can create secrets but cannot read them. Give yourself read access to the database secrets only:

```bash
gcloud projects add-iam-policy-binding $PROJECT --member=user:$ME --role=roles/secretmanager.secretAccessor --condition='expression=resource.name.startsWith("projects/'$PROJECT_NUMBER'/secrets/DB_"),title=db-secrets-developer'
```

After a conditional binding exists, every `add-iam-policy-binding` on the project needs an explicit `--condition` (all commands here have one).

Set the admin password (wait a minute after the grant above):

```bash
gcloud sql users set-password postgres --instance=$INSTANCE --password="$(gcloud secrets versions access latest --secret=DB_ADMIN_PASSWORD)"
```

Do not create the app users with `gcloud sql users create`: those join `cloudsqlsuperuser`. Step 3 creates them in SQL.

## Step 3: app roles

1. Show the admin password (only to you): `gcloud secrets versions access latest --secret=DB_ADMIN_PASSWORD; echo`
2. Console: SQL -> `app-db` -> **Cloud SQL Studio**. Database `app`, user `postgres`, that password.
3. Paste all of `db/cloud/roles.sql` and Run.
4. Set the two passwords from Secret Manager:

   ```bash
   gcloud sql users set-password app_owner --instance=$INSTANCE --password="$(gcloud secrets versions access latest --secret=DB_OWNER_PASSWORD)"
   gcloud sql users set-password app_runtime --instance=$INSTANCE --password="$(gcloud secrets versions access latest --secret=DB_PASSWORD)"
   ```

5. Run the check query at the end of `roles.sql` again. `app_owner` and `app_runtime` must show `in_cloudsqlsuperuser = false` and `rolbypassrls = false`. If not, stop.
6. Close Cloud Shell so the admin password does not stay on screen.

## Step 4: the API's service account

```bash
gcloud iam service-accounts create app-api --display-name="API runtime"
gcloud projects add-iam-policy-binding $PROJECT --member=serviceAccount:app-api@$PROJECT.iam.gserviceaccount.com --role=roles/cloudsql.client --condition=None
```

Access to the runtime password goes **on the secret itself**. `firebase deploy` checks the secret's own policy and otherwise tries to grant it, which the deploy account cannot do. Setting a secret's policy needs a temporary role:

```bash
gcloud projects add-iam-policy-binding $PROJECT --member=user:$ME --role=roles/secretmanager.admin --condition='expression=resource.name.startsWith("projects/'$PROJECT_NUMBER'/secrets/DB_"),title=db-secrets-admin-temp'
gcloud secrets add-iam-policy-binding DB_PASSWORD --member=serviceAccount:app-api@$PROJECT.iam.gserviceaccount.com --role=roles/secretmanager.secretAccessor
gcloud projects remove-iam-policy-binding $PROJECT --member=user:$ME --role=roles/secretmanager.admin --condition='expression=resource.name.startsWith("projects/'$PROJECT_NUMBER'/secrets/DB_"),title=db-secrets-admin-temp'
```

## Step 5: GitHub -> Google without keys (Workload Identity Federation)

Creating the pool needs a temporary role:

```bash
gcloud projects add-iam-policy-binding $PROJECT --member=user:$ME --role=roles/iam.workloadIdentityPoolAdmin --condition=None
```

Wait a minute, then:

```bash
gcloud iam workload-identity-pools create github --location=global --display-name="GitHub Actions"
gcloud iam workload-identity-pools providers create-oidc github-repo --location=global --workload-identity-pool=github --issuer-uri="https://token.actions.githubusercontent.com" --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" --attribute-condition="assertion.repository=='<github-repo>'"
gcloud iam service-accounts create github-deployer --display-name="GitHub deploy"
for R in roles/firebasehosting.admin roles/cloudfunctions.admin roles/run.admin roles/artifactregistry.writer roles/cloudbuild.builds.editor roles/secretmanager.viewer roles/cloudsql.client roles/serviceusage.serviceUsageConsumer roles/firebase.viewer; do gcloud projects add-iam-policy-binding $PROJECT --member=serviceAccount:github-deployer@$PROJECT.iam.gserviceaccount.com --role=$R --condition=None --quiet >/dev/null && echo "ok $R"; done
gcloud projects add-iam-policy-binding $PROJECT --member=serviceAccount:github-deployer@$PROJECT.iam.gserviceaccount.com --role=roles/secretmanager.secretAccessor --condition='expression=resource.name.startsWith("projects/'$PROJECT_NUMBER'/secrets/DB_OWNER_PASSWORD"),title=db-owner-password-only'
for SA in app-api@$PROJECT.iam.gserviceaccount.com $PROJECT_NUMBER-compute@developer.gserviceaccount.com $PROJECT@appspot.gserviceaccount.com; do gcloud iam service-accounts add-iam-policy-binding $SA --member=serviceAccount:github-deployer@$PROJECT.iam.gserviceaccount.com --role=roles/iam.serviceAccountUser; done
gcloud iam service-accounts add-iam-policy-binding github-deployer@$PROJECT.iam.gserviceaccount.com --role=roles/iam.workloadIdentityUser --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/<github-repo>"
gcloud iam workload-identity-pools providers describe github-repo --location=global --workload-identity-pool=github --format="value(name)"
```

Keep the last line's output for `WIF_PROVIDER`. Then remove the temporary role:

```bash
gcloud projects remove-iam-policy-binding $PROJECT --member=user:$ME --role=roles/iam.workloadIdentityPoolAdmin --condition=None
```

`firebase deploy` needs `actAs` on the default App Engine account (`<project-id>@appspot`) even though the function runs as `app-api`. That is why it is in the loop above. If the appspot or compute account does not exist yet, wait a minute after enabling the APIs and run that line again.

## Step 6: build service account and Artifact Registry

In an organization, the default compute account gets no roles automatically, and Cloud Build runs as it. Without this, building the function fails with "missing permission on the build service account":

```bash
gcloud projects add-iam-policy-binding $PROJECT --member=serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com --role=roles/cloudbuild.builds.builder --condition=None
```

A non-interactive deploy fails if the functions image repository has no cleanup policy. Create the repository, then set the policy from a machine where you are signed in to Firebase:

```bash
gcloud artifacts repositories create gcf-artifacts --repository-format=docker --location=$REGION --description="Cloud Functions images"
```

```bash
firebase functions:artifacts:setpolicy --project <project-id> --location <region> --days 7
```

## Step 7: web app and GitHub variables

Firebase console -> Project settings -> General -> Your apps -> Web (`</>`) -> nickname -> Register app (do not tick Hosting). Keep `apiKey`, `appId` and `messagingSenderId`. They are public: every browser receives them.

`authDomain` is the app's own domain, not the `<project-id>.firebaseapp.com` Firebase shows: on iPhone, Safari separates storage between domains and Google sign-in fails with "missing initial state". Add the matching sign-in handler to Google: Console -> Google Auth Platform -> Clients -> the Web client (auto created by Google Service) -> Authorized redirect URIs -> add `https://<project-id>.web.app/__/auth/handler` -> Save. When a custom domain is connected, add `https://<custom-domain>/__/auth/handler` the same way and switch the variable to that domain.

GitHub repository -> Settings -> Secrets and variables -> Actions -> **Variables** (not Secrets; none of these is secret). One variable per form:

| Name | Value |
|---|---|
| `FIREBASE_PROJECT_ID` | `<project-id>` |
| `GCP_REGION` | `<region>` |
| `CLOUD_SQL_INSTANCE` | `<project-id>:<region>:app-db` |
| `WIF_PROVIDER` | output of step 5 (`projects/<project-number>/locations/global/...`) |
| `DEPLOY_SERVICE_ACCOUNT` | `github-deployer@<project-id>.iam.gserviceaccount.com` |
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `<project-id>.web.app` (later the custom domain), **not** the `authDomain` Firebase shows |
| `VITE_FIREBASE_APP_ID` | `appId` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |

## Step 8: check, enable, first deploy

```bash
gcloud sql instances describe $INSTANCE --format="value(state)"      # RUNNABLE
gcloud secrets list --format="value(name)"                           # the three DB_ secrets
gcloud iam service-accounts list --format="value(email)"             # app-api and github-deployer
gcloud projects get-iam-policy $PROJECT --flatten="bindings[].members" --filter="bindings.members:$ME" --format="value(bindings.role)"   # no temporary roles left
```

Then enable the deploy and preview jobs in CI (a pull request). The preview job runs on that pull request and proves the GitHub -> Google connection before anything reaches the live site. Merging it is the first deploy.

**After the first deploy:** in an organization, Firebase may not make the function public, and `/api/health` answers 403 "Your client does not have permission". Check with `gcloud run services get-iam-policy api --region=$REGION`. If there is no `allUsers`, add it once with a temporary role:

```bash
gcloud projects add-iam-policy-binding $PROJECT --member=user:$ME --role=roles/run.admin --condition=None
gcloud run services add-iam-policy-binding api --region=$REGION --member=allUsers --role=roles/run.invoker
gcloud projects remove-iam-policy-binding $PROJECT --member=user:$ME --role=roles/run.admin --condition=None
```

This is safe by design: every route except `/api/health` requires a verified token. The binding survives later deploys.

## When a feature needs more (before merging that feature)

Do only the parts the feature uses, before its pull request is merged, and tick them in the pull request.

- **Google sign-in:** Firebase console -> Authentication -> Sign-in method -> Add provider -> Google -> Enable. Set "Public-facing name" to the product name (users see it on Google's consent screen; the default `project-<number>` looks broken) and the support email to a real address. Save.
- **The API creates identity tenants** (multi-tenant apps that add customers from the app): Allow tenants is on (step 1), and the API's account may manage tenants:

  ```bash
  gcloud projects add-iam-policy-binding $PROJECT --member=serviceAccount:app-api@$PROJECT.iam.gserviceaccount.com --role=roles/identityplatform.admin --condition=None
  ```

  Never add a tenant by hand in the console: the app creates each one together with its database row.
- **Files in Cloud Storage** (uploads read through signed URLs): one bucket, access on the bucket only, and the right to sign URLs as itself. Put the bucket name in `functions/.env.<project-id>`.

  ```bash
  gcloud storage buckets create gs://$PROJECT-files --location=$REGION --uniform-bucket-level-access --public-access-prevention
  gcloud storage buckets add-iam-policy-binding gs://$PROJECT-files --member=serviceAccount:app-api@$PROJECT.iam.gserviceaccount.com --role=roles/storage.objectAdmin
  gcloud iam service-accounts add-iam-policy-binding app-api@$PROJECT.iam.gserviceaccount.com --member=serviceAccount:app-api@$PROJECT.iam.gserviceaccount.com --role=roles/iam.serviceAccountTokenCreator
  ```

- **First platform admin** (after the deploy that adds platform admins): Cloud SQL Studio, database `app`, user `postgres` (password: step 3, item 1), then `insert into platform_admins (email) values ('<google-email-in-lower-case>');` and check with `select email from platform_admins;`. More admins are added the same way.

## Developer's standing access after setup

`Editor`, `Project IAM Admin`, `Service Account Admin`, and read access to the `DB_` secrets. Nothing else. Tell the project owner which temporary roles were used and that they were removed.
