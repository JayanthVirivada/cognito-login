# JSolutions sign-in page

A sign-in page built with plain HTML, CSS and JavaScript on top of Amazon Cognito. It covers the full account flow:

- Create an account with an emailed 6-digit verification code
- Sign in with email and password
- Two-step verification with an authenticator app (TOTP)
- Reset a forgotten password with an emailed code
- Change password while signed in

The Cognito calls use the AWS Amplify Auth library. Passwords are checked with the Secure Remote Password (SRP) protocol, so they are not sent over the network.

## Run it

You need Node.js (current LTS) and an AWS account.

1. Create a Cognito user pool in the AWS console:
   - Application type: Single-page application (SPA), so the app client has no client secret
   - Sign-in identifier: Email
   - Self-registration: on (only while testing)
   - Return URL: `http://localhost:5173/`
2. In the app client, make sure `ALLOW_USER_SRP_AUTH` and `ALLOW_REFRESH_TOKEN_AUTH` are enabled.
3. In `app.js`, replace `userPoolId` and `userPoolClientId` with your own values. These IDs are not secrets.
4. For two-step verification, set the pool's MFA to Require MFA with Authenticator apps only.
5. Install and start:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Notes

- Never put a client secret or AWS access keys in browser code.
- Turn off self-registration once testing is finished.
- Host the page over HTTPS before using it publicly.
